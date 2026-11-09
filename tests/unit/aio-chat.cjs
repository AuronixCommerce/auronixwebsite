const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { harness } = require("../helpers/route-harness.cjs");
const root = path.resolve(__dirname, "../..");
function load(file, mocks = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => {
      if (mocks[id]) return mocks[id];
      if (id.startsWith("@/")) return load(id.slice(2) + ".ts", mocks);
      if (id.startsWith("."))
        return load(path.join(path.dirname(file), id) + ".ts", mocks);
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { currentChatContext, normalizeChatPreferences } = load(
  "lib/aio/preferences.ts",
);
const { readAioStream } = load("lib/aio/stream.ts");
const user = (content) => ({ role: "user", content });
const assistant = (content) => ({ role: "assistant", content });
test("new conversations exclude earlier topics and context-off sends only the latest question", () => {
  const messages = [
    user("Private earlier topic"),
    assistant("Earlier reply"),
    { role: "assistant", content: "", sessionBoundary: true },
    user("Current question"),
    assistant("Current reply"),
    user("What next?"),
  ];
  assert.deepEqual(currentChatContext(messages), messages.slice(3));
  assert.deepEqual(currentChatContext(messages, false), [user("What next?")]);
});
test("long histories stay within the API limit and start with a user turn", () => {
  const messages = Array.from({ length: 70 }, (_, i) =>
    i % 2 ? assistant(String(i)) : user(String(i)),
  );
  const result = currentChatContext(messages);
  assert.ok(result.length <= 18);
  assert.equal(result[0].role, "user");
  assert.equal(result.at(-1).content, "69");
  assert.equal(
    currentChatContext([user("x".repeat(9000))])[0].content.length,
    6000,
  );
});
test("invalid stored preferences cannot replace valid enum and boolean defaults", () => {
  const p = normalizeChatPreferences({
    replyLength: "anything",
    tone: "untrusted",
    rememberHistory: "false",
    showSources: false,
  });
  assert.equal(p.replyLength, "adaptive");
  assert.equal(p.tone, "professional");
  assert.equal(p.rememberHistory, true);
  assert.equal(p.showSources, false);
});
function byteStream(text, size = 1) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size)
        controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    },
  });
}
test("stream parser preserves UTF-8 and handles split CRLF plus a final frame without a blank line", async () => {
  const raw =
    ': keepalive\r\n\r\ndata: {"type":"token","token":"Hello 🌍"}\r\n\r\ndata: {"type":"message_complete","requestId":"test","answerSource":"general"}';
  const events = [];
  for await (const e of readAioStream(byteStream(raw))) events.push(e);
  assert.equal(events[0].token, "Hello 🌍");
  assert.equal(events[1].type, "message_complete");
});
test("malformed streams fail visibly and early consumer exit cancels the reader", async () => {
  await assert.rejects(async () => {
    for await (const e of readAioStream(byteStream("data: not-json\n\n")))
      void e;
  }, /interrupted/);
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(
        new TextEncoder().encode(
          'data: {"type":"token","token":"partial"}\n\n',
        ),
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  for await (const e of readAioStream(stream)) {
    assert.equal(e.token, "partial");
    break;
  }
  assert.equal(cancelled, true);
});
test("AI setting patches preserve model configuration and unrelated settings", async () => {
  const h = harness({
    settings: {
      ai: {
        aioModel: "existing-model",
        aioRetrievalLimit: 5,
        enabled: false,
        customInstructions: "Existing instructions",
      },
    },
  });
  const res = await h.call("app/api/admin/ai-settings/route.ts", {
    aioTone: "friendly",
    aioMaxResponseTokens: 2000,
  });
  assert.equal(res.status, 200);
  assert.equal(h.data.settings.ai.aioModel, "existing-model");
  assert.equal(h.data.settings.ai.enabled, false);
  assert.equal(h.data.settings.ai.customInstructions, "Existing instructions");
  assert.equal(h.data.settings.ai.aioTone, "friendly");
});
test("AI settings reject invalid budgets, model IDs, and unauthorized changes", async () => {
  const h = harness();
  for (const body of [
    { aioMaxResponseTokens: 9000 },
    { aioRetrievalLimit: 0 },
    { aioTone: "magic" },
    { aioModel: "bad model!" },
  ])
    assert.equal(
      (await h.call("app/api/admin/ai-settings/route.ts", body)).status,
      400,
    );
  h.setAdmin(false);
  assert.notEqual(
    (await h.call("app/api/admin/ai-settings/route.ts", { enabled: true }))
      .status,
    200,
  );
});
test("reply prompt applies preferences while retaining evidence and action boundaries", () => {
  const { buildAioSystemPrompt } = load("lib/aio/system-prompt.ts");
  const prompt = buildAioSystemPrompt({
    pathname: "/",
    decision: { intent: "support", continuation: true },
    evidence: [],
    currentDate: "2026-11-08",
    replyLength: "detailed",
    tone: "friendly",
    customInstructions: "Keep examples practical.",
    selectedText: "Untrusted selected text",
  });
  assert.match(prompt, /thorough, organized/);
  assert.match(prompt, /warm, approachable/);
  assert.match(prompt, /Keep examples practical/);
  assert.match(prompt, /Never pretend an action succeeded/);
  assert.match(prompt, /untrusted reference data/);
});
test("provider uses model-compatible options and exposes completion limits without duplicating partial replies", async () => {
  const calls = [];
  class Groq {
    constructor() {
      this.chat = {
        completions: {
          create: async (args, options) => {
            calls.push({ args, options });
            if (args.model === "test-primary")
              throw new Error("503 unavailable");
            return (async function* () {
              yield { choices: [{ delta: { content: "Answer" } }] };
              yield { choices: [{ delta: {}, finish_reason: "length" }] };
            })();
          },
        },
      };
    }
  }
  const original = process.env.AIO_API_KEY;
  process.env.AIO_API_KEY = "test-key";
  try {
    const { createAioProvider } = load("lib/aio/provider.ts", {
      "groq-sdk": { default: Groq },
    });
    const provider = createAioProvider({
      model: "test-primary",
      fallbackModel: "openai/gpt-oss-120b",
    });
    const signal = new AbortController().signal;
    const chunks = [];
    for await (const x of provider.stream({
      messages: [user("Test")],
      maxTokens: 500,
      signal,
    }))
      chunks.push(x);
    assert.equal(calls.length, 2);
    assert.equal("reasoning_effort" in calls[0].args, false);
    assert.equal(calls[1].args.reasoning_effort, "medium");
    assert.equal(calls[1].options.signal, signal);
    assert.equal(chunks.map((x) => x.token).join(""), "Answer");
    assert.equal(chunks.at(-1).finishReason, "length");
    assert.equal(chunks[0].info.usedFallback, true);
  } finally {
    if (original === undefined) delete process.env.AIO_API_KEY;
    else process.env.AIO_API_KEY = original;
  }
});

test("chat endpoint applies settings, streams truncation metadata, and honors history opt-out", async () => {
  const h = harness({
    settings: {
      ai: {
        aioMaxResponseTokens: 2100,
        aioTemperature: 0.35,
        aioOneModel: "configured-classic",
        customInstructions: "Give practical examples.",
        aioTone: "direct",
      },
    },
  });
  let providerRequest, providerConfig,
    saves = 0;
  const route = load("app/api/aio/chat/route.ts", {
    "@/lib/firebase-admin": {
      adminDb: { ref: h.ref },
      adminAuth: { verifyIdToken: async () => ({ uid: "test-user" }) },
    },
    "@/lib/server-protection": {
      protectPublicRequest: async () => {},
      publicRequestErrorResponse: () => null,
    },
    "@/lib/server-maintenance-context": {
      getMaintenanceContext: async () => null,
    },
    "@/lib/ai-premade-memory": { findPremadeAnswer: () => null },
    "@/lib/aio/history": {
      saveAuthenticatedAioTurn: async () => {
        saves++;
      },
    },
    "@/lib/aio/observability": { writeAioLog: async () => {} },
    "@/lib/aio/provider": {
      isAioConfigured: () => true,
      AioProviderError: class extends Error {},
      createAioProvider: (options) => (providerConfig=options, {
        name: "test",
        async *stream(request) {
          providerRequest = request;
          yield {
            token: "Example answer",
            info: { provider: "test", model: "test", usedFallback: false },
          };
          yield {
            token: "",
            finishReason: "length",
            info: { provider: "test", model: "test", usedFallback: false },
          };
        },
      }),
    },
  });
  const response = await route.POST(
    new Request("http://localhost/api/aio/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
      },
      body: JSON.stringify({
        conversationId: "test-conversation",
        messages: [user("Explain a general concept")],
        preferences: {
          model: "aio-one",
          replyLength: "detailed",
          tone: "friendly",
          saveHistory: false,
        },
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  const text = await response.text();
  assert.match(text, /"truncated":true/);
  assert.equal(providerConfig.model, "configured-classic");
  assert.equal(providerRequest.maxTokens, 2100);
  assert.equal(providerRequest.temperature, 0.35);
  assert.match(providerRequest.messages[0].content, /thorough, organized/);
  assert.match(providerRequest.messages[0].content, /warm, approachable/);
  assert.match(providerRequest.messages[0].content, /Give practical examples/);
  assert.equal(saves, 0);
});
test("provider never falls back after partial output or request cancellation", async () => {
  const original = process.env.AIO_API_KEY;
  process.env.AIO_API_KEY = "test-key";
  let calls = 0,
    abort = false;
  class Groq {
    constructor() {
      this.chat = {
        completions: {
          create: async () => {
            calls++;
            if (abort) throw new Error("cancelled");
            return (async function* () {
              yield { choices: [{ delta: { content: "Partial reply" } }] };
              throw new Error("503 unavailable");
            })();
          },
        },
      };
    }
  }
  try {
    const { createAioProvider } = load("lib/aio/provider.ts", {
      "groq-sdk": { default: Groq },
    });
    const p = createAioProvider({ model: "first", fallbackModel: "second" });
    const chunks = [];
    await assert.rejects(async () => {
      for await (const chunk of p.stream({
        messages: [user("Test")],
        maxTokens: 500,
      }))
        chunks.push(chunk);
    });
    assert.equal(calls, 1);
    assert.equal(chunks[0].token, "Partial reply");
    abort = true;
    calls = 0;
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(async () => {
      for await (const x of p.stream({
        messages: [user("Test")],
        maxTokens: 500,
        signal: controller.signal,
      }))
        void x;
    }, /cancelled/);
    assert.equal(calls, 1);
  } finally {
    if (original === undefined) delete process.env.AIO_API_KEY;
    else process.env.AIO_API_KEY = original;
  }
});
test('public AIO selection maps to configured models and rejects arbitrary model IDs',()=>{const {resolveAioModel,normalizeAioModelId}=load('lib/aio/models.ts');assert.equal(resolveAioModel('aio-2',{aioModel:'configured-primary'}),'configured-primary');assert.equal(resolveAioModel('aio-2-fast',{}),'openai/gpt-oss-20b');assert.equal(resolveAioModel('aio-2-fast',{aioFastModel:'configured-fast'}),'configured-fast');assert.equal(normalizeAioModelId('injected-model'),'aio-2');assert.equal(normalizeChatPreferences({model:'aio-2-fast'}).model,'aio-2-fast')});

test('transcript emails require inbox verification, expire, and cannot be replayed', async()=>{
  const h=harness();const route='app/api/aio/transcript/route.ts';
  const payload={email:'reader@example.com',messages:[user('<script>private</script>'),assistant('Answer')]};
  assert.equal((await h.call(route,{...payload,email:'bad'})).status,400);
  const first=await h.call(route,payload);assert.equal(first.status,200);assert.equal(h.mails.length,1);
  assert.ok(!h.mails[0].body.includes('private'));
  const code=h.mails[0].body.match(/\b\d{6}\b/)[0];
  assert.equal((await h.call(route,{...payload,challengeId:first.body.challengeId,code:'000000'})).status,400);
  assert.equal((await h.call(route,{...payload,email:'other@example.com',challengeId:first.body.challengeId,code})).status,400);
  assert.equal((await h.call(route,{...payload,challengeId:first.body.challengeId,code})).status,200);
  assert.ok(h.mails[1].body.includes('private'));
  assert.equal((await h.call(route,{...payload,challengeId:first.body.challengeId,code})).status,400);
  const expired=await h.call(route,payload);h.data.aioTranscriptChallenges[expired.body.challengeId].expiresAt=0;
  assert.equal((await h.call(route,{...payload,challengeId:expired.body.challengeId,code})).status,400);
});
test('transcript mail failure reports an error and removes unsent challenges',async()=>{
  const h=harness();h.failMail(true);const r=await h.call('app/api/aio/transcript/route.ts',{email:'reader@example.com',messages:[user('hello')]});
  assert.equal(r.status,503);assert.equal(r.body.success,false);assert.equal(Object.keys(h.data.aioTranscriptChallenges).length,0);
});
test('shared mail reports accepted delivery, escapes transcript HTML, and avoids retrying partially accepted recipients',async()=>{
  const previous=process.env.SMTP_PASSWORD;process.env.SMTP_PASSWORD='test-only';let captured;
  try{
    const mail=load('lib/server-mail.ts',{nodemailer:{default:{createTransport:()=>({sendMail:async options=>{captured=options;return {accepted:['reader@example.com'],rejected:[],messageId:'test-mail'};}})}}});
    const r=await mail.sendProfessionalEmail({to:'reader@example.com',body:'<script>alert(1)</script>',subject:'Transcript',inReplyTo:'thread-id'});
    assert.equal(r.success,true);assert.ok(captured.html.includes('&lt;script&gt;'));assert.equal(captured.inReplyTo,'thread-id');
    await mail.sendTicketResponseEmail('reader@example.com','Support subject','Support body');assert.equal(captured.text,'Support body');
    let calls=0;
    const partial=load('lib/server-mail.ts',{nodemailer:{default:{createTransport:()=>({sendMail:async()=>{calls++;return {accepted:['one@example.com'],rejected:['two@example.com']};}})}}});
    await assert.rejects(partial.sendBusinessMail({to:['one@example.com','two@example.com'],subject:'Test',html:'Test'}));assert.equal(calls,1);
  }finally{if(previous===undefined)delete process.env.SMTP_PASSWORD;else process.env.SMTP_PASSWORD=previous;}
});
test('site search ranks exact and prefix titles, finds affiliate aliases and common typos',()=>{
  const {fuzzyScore}=load('lib/design/search-score.ts');
  assert.ok(fuzzyScore('Affiliate Shop','affliate')>0);assert.ok(fuzzyScore('Affiliate Shop','products')>0);
  assert.ok(fuzzyScore('Supplier application','suplier')>0);
  assert.ok(fuzzyScore('Support','Support')>fuzzyScore('Contact support team','Support'));
  assert.equal(fuzzyScore('Support','unrelated'),0);
});
test('admin composer validates recipients and returns explicit success after SMTP acceptance',async()=>{
  const route=load('app/api/admin/email/send/route.ts',{'@/lib/server-auth':{requireAdmin:async()=>({uid:'admin'})},'@/lib/server-mail':{sendProfessionalEmail:async()=>({success:true,messageId:'accepted-mail'})}});
  const call=async body=>{const r=await route.POST(new Request('http://localhost/api/admin/email/send',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};};
  assert.equal((await call({to:'invalid',subject:'Hello',body:'Test'})).status,400);
  const result=await call({to:'customer@example.com',subject:'Hello',body:'Test'});assert.equal(result.status,200);assert.equal(result.body.success,true);assert.equal(result.body.messageId,'accepted-mail');
});

test('AIO One is selectable and uses its own configured provider mapping',()=>{const {resolveAioModel,normalizeAioModelId}=load('lib/aio/models.ts');assert.equal(normalizeAioModelId('aio-one'),'aio-one');assert.equal(normalizeChatPreferences({model:'aio-one'}).model,'aio-one');assert.equal(resolveAioModel('aio-one',{}),'openai/gpt-oss-20b');assert.equal(resolveAioModel('aio-one',{aioOneModel:'classic-provider'}),'classic-provider');});
test('classic reply pacing preserves Unicode, event order and completion without slowing other modes',async()=>{
 const {paceAioEvents}=load('lib/aio/pace.ts'); const text='A🌍'.repeat(30);const original=[{type:'status',label:'Working'},{type:'token',token:text},{type:'message_complete',requestId:'test',answerSource:'general'}];
 async function* events(){yield* original;}
 let waits=0;const result=[];for await(const e of paceAioEvents(events(),'aio-one',new AbortController().signal,async()=>{waits++;}))result.push(e);
 assert.ok(waits>1);assert.equal(result.filter(e=>e.type==='token').map(e=>e.token).join(''),text);assert.equal(result[0].type,'status');assert.equal(result.at(-1).type,'message_complete');
 for await(const e of paceAioEvents(events(),'aio-2',new AbortController().signal,async()=>{assert.fail('modern mode must not wait');}))void e;
});
test('stopping a paced reply cancels promptly and closes its upstream stream',async()=>{
 const {paceAioEvents}=load('lib/aio/pace.ts');const controller=new AbortController();let closed=false;
 async function* events(){try{yield {type:'token',token:'delayed'};}finally{closed=true;}}
 const stream=paceAioEvents(events(),'aio-one',controller.signal);const next=stream.next();controller.abort();await assert.rejects(next,{name:'AbortError'});assert.equal(closed,true);
});
