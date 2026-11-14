const { test } = require("node:test");
const assert = require("node:assert/strict");
const { harness } = require("../helpers/route-harness.cjs");
function setup(extra = {}) {
  const h = harness({
    aioDeveloperAccounts: {
      alice: {
        uid: "alice",
        name: "Alice",
        email: "alice@example.test",
        status: "approved",
        termsVersion: "2026-11-13-manual-v1",
      },
      bob: { uid: "bob", status: "pending" },
    },
    settings: {
      aioDeveloperApi: {
        enabled: true,
        usdCentsPerCredit: 100,
        requestsPerMinute: 30,
        rates: {
          "aio-one": { input: 100000, output: 200000 },
          "aio-2": { input: 100000, output: 200000 },
          "aio-2-fast": { input: 100000, output: 200000 },
        },
      },
    },
    ...extra,
  });
  let providerCalls = 0,
    providerFailure = false,
    verified = true,
    disabled = false;
  const read = (p) =>
    p
      .split("/")
      .filter(Boolean)
      .reduce((v, k) => v?.[k], h.data);
  const wrap = (p = "") => {
    const r = h.ref(p);
    return {
      ...r,
      orderByKey: () => {
        let end = "",
          start = "";
        const q = {
          startAt: (s) => {
            start = s;
            return q;
          },
          endAt: (s) => {
            end = s;
            return q;
          },
          limitToLast: (n) => ({
            get: async () => {
              const data = Object.fromEntries(
                Object.entries(read(p) || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .filter(
                    ([id]) => (!end || id <= end) && (!start || id >= start),
                  )
                  .slice(-n),
              );
              return {
                val: () => data,
                exists: () => !!Object.keys(data).length,
              };
            },
          }),
        };
        return q;
      },
    };
  };
  h.mocks["@/lib/firebase-admin"].adminDb = { ref: wrap };
  Object.assign(h.mocks["@/lib/firebase-admin"].adminAuth, {
    verifyIdToken: async (token) => {
      if (!["alice", "bob"].includes(token)) throw Error("Invalid token");
      return { uid: token };
    },
    getUser: async (uid) => ({
      uid,
      email: `${uid}@example.test`,
      emailVerified: verified,
      disabled,
    }),
    generateEmailVerificationLink: async () =>
      "https://example.test/verify-email",
  });
  h.mocks["@/lib/developers/provider"] = {
    providerModel: async () => "upstream-model",
    complete: async () => {
      providerCalls++;
      if (providerFailure) throw Error("Provider down");
      return {
        content: "Test answer",
        usage: { prompt_tokens: 20, completion_tokens: 30 },
        finishReason: "stop",
      };
    },
  };
  let webhookPosts = [],
    transportFailure = false;
  h.mocks["@/lib/developers/webhook-network"] = {
    resolveWebhook: async (url) => {
      if (!String(url).startsWith("https://hooks.example.com/"))
        throw Error("Only test endpoint allowed.");
      return { url: new URL(url), address: { address: "8.8.8.8", family: 4 } };
    },
    postWebhook: async (url, raw, headers) => {
      if (transportFailure) throw Error("Test delivery unavailable.");
      webhookPosts.push({ url, raw, headers });
      return 204;
    },
  };
  h.mocks["./webhook-network"] = h.mocks["@/lib/developers/webhook-network"];
  const mod = h.load("lib/developers/server.ts"),
    model = h.load("lib/developers/model.ts");
  async function call(file, body, opts = {}) {
    const request = new Request(
      "http://localhost/api/test" + (opts.query || ""),
      {
        method: body ? "POST" : "GET",
        headers: {
          origin: opts.origin || "http://localhost",
          authorization: "Bearer " + (opts.token || "alice"),
          "content-type": "application/json",
          ...opts.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    const result = await h.load(file)[body ? "POST" : "GET"](request);
    return { status: result.status, body: await result.json() };
  }
  return {
    ...h,
    mod,
    model,
    call,
    calls: () => providerCalls,
    failProvider: () => (providerFailure = true),
    unverify: () => (verified = false),
    disable: () => (disabled = true),
    webhookPosts,
    failWebhook: (value = true) => (transportFailure = value),
  };
}
const ACCOUNT = "app/api/developers/account/route.ts",
  KEYS = "app/api/developers/keys/route.ts",
  ADMIN = "app/api/admin/developers/route.ts",
  CHAT = "app/api/aio/v1/chat/completions/route.ts";
const input = {
  model: "aio-2-fast",
  messages: [{ role: "user", content: "Hello" }],
  max_completion_tokens: 64,
};
async function funded(h, units = 1000000) {
  await h.mod.grant(
    "alice",
    "grant1",
    units,
    "admin",
    "receipt-001",
    "Verified test payment",
  );
  return (await h.mod.createKey("alice", "Production")).secret;
}
test("developer keys reveal a secret once, store only its hash, and cannot be managed by another account", async () => {
  const h = setup(),
    r = await h.call(KEYS, { action: "create", name: "Production" });
  assert.equal(r.status, 201);
  assert.match(r.body.secret, /^aio_live_[a-f0-9]{32}_[a-f0-9]{48}$/);
  assert.equal(JSON.stringify(h.data).includes(r.body.secret), false);
  const listing = await h.call(KEYS);
  assert.equal(listing.body.items[0].name, "Production");
  assert.equal(listing.body.items[0].secret, undefined);
  const other = await h.call(
    KEYS,
    { action: "revoke", id: r.body.id },
    { token: "bob" },
  );
  assert.equal(other.status, 404);
});
test("pending and unverified accounts cannot create API keys or self-approve", async () => {
  const h = setup();
  assert.equal(
    (await h.call(KEYS, { action: "create", name: "Bad" }, { token: "bob" }))
      .status,
    403,
  );
  h.unverify();
  assert.equal(
    (await h.call(KEYS, { action: "create", name: "Bad" })).status,
    403,
  );
  h.setAdmin(false);
  assert.equal(
    (
      await h.call(
        ADMIN,
        { action: "status", uid: "bob", status: "approved", note: "Escalate" },
        { token: "bob" },
      )
    ).status,
    403,
  );
});
test("application creates pending access only and cannot overwrite an approval or credit balance", async () => {
  const h = setup();
  delete h.data.aioDeveloperAccounts.alice;
  const r = await h.call(ACCOUNT, {
    action: "apply",
    name: "Alice",
    useCase: "A server application for summarizing product data",
    accepted: true,
    status: "approved",
    balance: 999999,
  });
  assert.equal(r.status, 200);
  assert.equal(h.data.aioDeveloperAccounts.alice.status, "pending");
  assert.equal(h.data.aioDeveloperBilling, undefined);
  assert.equal(
    (
      await h.call(ACCOUNT, {
        action: "apply",
        name: "Alice",
        useCase: "A different application with enough text",
        accepted: true,
      })
    ).status,
    409,
  );
});
test("admin approval requires a review note and is audited", async () => {
  const h = setup();
  assert.equal(
    (await h.call(ADMIN, { action: "status", uid: "bob", status: "approved" }))
      .status,
    400,
  );
  assert.equal(
    (
      await h.call(ADMIN, {
        action: "status",
        uid: "bob",
        status: "approved",
        note: "Reviewed use case and approved.",
      })
    ).status,
    200,
  );
  assert.equal(h.data.aioDeveloperAccounts.bob.status, "approved");
  assert.ok(
    Object.values(h.data.adminAuditLogs).some(
      (x) => x.action === "aio.api.approved",
    ),
  );
});
test("API completion charges actual provider usage and releases the remaining hold", async () => {
  const h = setup(),
    key = await funded(h);
  const r = await h.call(CHAT, input, {
    token: key,
    headers: { "idempotency-key": "request-001" },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.billing.charged_units, 8000);
  assert.equal(r.body.billing.available_units, 992000);
  assert.equal(h.calls(), 1);
  assert.equal(r.body.usage.total_tokens, 50);
  assert.equal(h.data.aioDeveloperBilling.alice.spent, 8000);
  const usage = Object.values(h.data.aioDeveloperUsage.alice)[0];
  assert.equal(usage.status, "completed");
  assert.equal(usage.charged, 8000);
  assert.equal(usage.fingerprint, undefined);
  assert.equal(JSON.stringify(h.data).includes("Test answer"), false);
});
test("reusing an idempotency key never calls the provider or bills twice", async () => {
  const h = setup(),
    key = await funded(h),
    opts = { token: key, headers: { "idempotency-key": "same-request-001" } };
  assert.equal((await h.call(CHAT, input, opts)).status, 200);
  assert.equal((await h.call(CHAT, input, opts)).status, 409);
  assert.equal(h.calls(), 1);
  assert.equal(h.data.aioDeveloperBilling.alice.spent, 8000);
});
test("unfunded, suspended, disabled, and revoked keys never call the provider", async () => {
  const h = setup(),
    key = (await h.mod.createKey("alice", "Unfunded")).secret;
  assert.equal((await h.call(CHAT, input, { token: key })).status, 402);
  assert.equal(h.calls(), 0);
  await funded(h);
  h.data.aioDeveloperAccounts.alice.status = "suspended";
  assert.equal((await h.call(CHAT, input, { token: key })).status, 403);
  h.data.aioDeveloperAccounts.alice.status = "approved";
  h.disable();
  assert.equal((await h.call(CHAT, input, { token: key })).status, 403);
  assert.equal(h.calls(), 0);
  const fresh = setup(),
    revoked = await funded(fresh);
  const id = revoked.split("_")[2];
  assert.equal((await fresh.call(KEYS, { action: "revoke", id })).status, 200);
  assert.equal((await fresh.call(CHAT, input, { token: revoked })).status, 401);
  assert.equal(fresh.calls(), 0);
});
test("provider failures refund the full reservation with no charge", async () => {
  const h = setup(),
    key = await funded(h);
  h.failProvider();
  assert.equal((await h.call(CHAT, input, { token: key })).status, 502);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 1000000);
  assert.equal(h.data.aioDeveloperBilling.alice.spent, 0);
  assert.equal(
    Object.values(h.data.aioDeveloperUsage.alice)[0].status,
    "failed",
  );
});
test("simultaneous reservations across keys cannot overspend the shared wallet", async () => {
  const h = setup();
  await funded(h, 100);
  const results = await Promise.allSettled([
    h.mod.reserve("alice", "request1", 80, "aio-2", "key1", 30, "fingerprint"),
    h.mod.reserve("alice", "request2", 80, "aio-2", "key2", 30, "fingerprint"),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 20);
});
test("settlement is single-use and stale holds recover without charging", async () => {
  const h = setup();
  await funded(h, 100);
  await h.mod.reserve(
    "alice",
    "request1",
    80,
    "aio-2",
    "key1",
    30,
    "fingerprint",
  );
  await h.mod.settle(
    "alice",
    "request1",
    { prompt_tokens: 1, completion_tokens: 1 },
    20,
  );
  await assert.rejects(
    h.mod.settle("alice", "request1"),
    /could not be settled/,
  );
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 80);
  await h.mod.reserve(
    "alice",
    "request2",
    70,
    "aio-2",
    "key2",
    30,
    "fingerprint",
  );
  h.data.aioDeveloperBilling.alice.requests.request2.expiresAt = Date.now() - 1;
  const w = await h.mod.wallet("alice");
  assert.equal(w.balance, 80);
  assert.equal(w.reserved, 0);
  assert.ok(
    Object.values(h.data.aioDeveloperUsage.alice).some(
      (r) => r.status === "expired",
    ),
  );
});
test("one account-wide rate limit applies across different keys", async () => {
  const h = setup();
  await funded(h);
  await h.mod.reserve(
    "alice",
    "request1",
    10,
    "aio-2",
    "key1",
    1,
    "fingerprint",
  );
  await assert.rejects(
    h.mod.reserve("alice", "request2", 10, "aio-2", "key2", 1, "fingerprint"),
    (e) => e.status === 429,
  );
});
test("credit grants reject duplicate payment references even with different invoice IDs", async () => {
  const h = setup();
  await funded(h);
  await assert.rejects(
    h.mod.grant(
      "alice",
      "other-invoice",
      1000000,
      "admin",
      "RECEIPT-001",
      "Duplicate reference",
    ),
    (e) => e.status === 409,
  );
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 1000000);
});
test("invoice requests lock the server quote and cannot grant credits from a customer payload", async () => {
  const h = setup();
  const r = await h.call(ACCOUNT, {
    action: "invoice",
    termsAccepted: true,
    credits: 10,
    usdCents: 1,
    status: "credited",
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.invoice.usdCents, 1000);
  assert.equal(r.body.invoice.status, "requested");
  assert.equal(h.data.aioDeveloperBilling, undefined);
  assert.equal(
    (await h.call(ACCOUNT, { action: "credit", credits: 1000 })).status,
    400,
  );
});
test("verified invoice grants are idempotent and require explicit admin verification", async () => {
  const h = setup(),
    requested = await h.call(ACCOUNT, {
      action: "invoice",
      credits: 10,
      termsAccepted: true,
    }),
    id = requested.body.invoice.id;
  const grant = {
    action: "credit",
    uid: "alice",
    credits: 10,
    invoiceId: id,
    reference: "receipt10",
    reason: "Payment verified",
    receivedUsdCents: 1000,
  };
  await h.call(ADMIN, {
    action: "invoice-review",
    uid: "alice",
    invoiceId: id,
    reviewAction: "send-instructions",
    instructions:
      "Verified test destination for USD transfer. Include request ID.",
    note: "Use these payment instructions.",
  });
  await h.call(ACCOUNT, {
    action: "submit-payment",
    invoiceId: id,
    reference: "receipt10",
    method: "Test transfer",
    confirmed: true,
    termsAccepted: true,
  });
  assert.equal((await h.call(ADMIN, grant)).status, 400);
  assert.equal(
    (await h.call(ADMIN, { ...grant, paymentVerified: true })).status,
    200,
  );
  assert.equal(
    (
      await h.call(ADMIN, {
        ...grant,
        paymentVerified: true,
        reference: "second-receipt",
      })
    ).status,
    409,
  );
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 10000000);
  assert.equal(h.data.aioDeveloperInvoices.alice[id].status, "credited");
});
test("unpublished pricing and invalid payloads cannot generate or charge", async () => {
  const h = setup(),
    key = await funded(h);
  for (const b of [
    { ...input, stream: true },
    { ...input, max_completion_tokens: 50000 },
    { ...input, tools: [] },
    { ...input, messages: [{ role: "user", content: "x".repeat(17000) }] },
  ])
    assert.equal((await h.call(CHAT, b, { token: key })).status, 400);
  h.data.settings.aioDeveloperApi.enabled = false;
  assert.equal((await h.call(CHAT, input, { token: key })).status, 503);
  assert.equal(h.calls(), 0);
});
test("same-origin protections and authenticated ownership apply to account mutations", async () => {
  const h = setup();
  assert.equal(
    (
      await h.call(
        KEYS,
        { action: "create", name: "Bad" },
        { origin: "https://evil.test" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await h.call(ACCOUNT, undefined, { token: "invalid" })).status,
    401,
  );
  const r = await h.call(ACCOUNT);
  assert.equal(r.body.account.uid, "alice");
});
test("usage pagination is newest first and bounded, and secrets do not appear in account responses", async () => {
  const h = setup();
  h.data.aioDeveloperUsage = {
    alice: Object.fromEntries(
      Array.from({ length: 65 }, (_, i) => [
        String(1000000000000 + i) + "_request",
        { model: "aio-2", createdAt: i, status: "completed" },
      ]),
    ),
  };
  const r = await h.call(ACCOUNT, undefined, { query: "?view=usage" });
  assert.equal(r.body.items.length, 50);
  assert.ok(r.body.next);
  const next = await h.call(ACCOUNT, undefined, {
    query: "?view=usage&cursor=" + r.body.next,
  });
  assert.equal(next.body.items.length, 15);
  assert.equal(
    new Set([...r.body.items, ...next.body.items].map((x) => x.id)).size,
    65,
  );
});
test("settled history stays outside the hot wallet while duplicate protection remains active", async () => {
  const h = setup(),
    key = await funded(h);
  await h.call(CHAT, input, {
    token: key,
    headers: { "idempotency-key": "request-slim-001" },
  });
  assert.equal(
    Object.keys(h.data.aioDeveloperBilling.alice.requests || {}).length,
    0,
  );
  assert.equal(Object.keys(h.data.aioDeveloperUsage.alice).length, 1);
  assert.equal(Object.keys(h.data.aioDeveloperRequestClaims).length, 1);
  assert.equal(
    (
      await h.call(CHAT, input, {
        token: key,
        headers: { "idempotency-key": "request-slim-001" },
      })
    ).status,
    409,
  );
});
const PLAYGROUND = "app/api/developers/playground/route.ts";
async function paymentReady(h, options = {}) {
  const requested = await h.call(ACCOUNT, {
    action: "invoice",
    credits: 10,
    termsAccepted: true,
  });
  assert.equal(requested.status, 200);
  const id = requested.body.invoice.id;
  const instructions = await h.call(ADMIN, {
    action: "invoice-review",
    uid: "alice",
    invoiceId: id,
    reviewAction: "send-instructions",
    instructions:
      "Send the exact quoted USD amount to this verified test destination.",
    note: "Include your request ID and submit the reference afterward.",
  });
  assert.equal(instructions.status, 200);
  if (!options.noSubmit)
    assert.equal(
      (
        await h.call(ACCOUNT, {
          action: "submit-payment",
          invoiceId: id,
          reference: "customer-reference",
          method: "Bank transfer",
          confirmed: true,
          termsAccepted: true,
        })
      ).status,
      200,
    );
  return id;
}
function approve(id, changes = {}) {
  return {
    action: "credit",
    uid: "alice",
    invoiceId: id,
    credits: 10,
    reference: "verified-receipt",
    reason: "Verified the received transfer in the payment account.",
    receivedUsdCents: 1000,
    paymentVerified: true,
    ...changes,
  };
}
test("launch pricing is usable by default and explicit admin pauses remain respected", async () => {
  const h = setup({ settings: {} }),
    p = await h.mod.getPricing();
  assert.equal(p.enabled, true);
  assert.equal(p.usdCentsPerCredit, 100);
  assert.equal(p.rates["aio-2"].input, 500);
  assert.equal(p.rates["aio-2-fast"].output, 1000);
  const paused = setup();
  paused.data.settings.aioDeveloperApi.enabled = false;
  assert.equal((await paused.mod.getPricing()).enabled, false);
});
test("manual payment instructions and submitted references never create credits without approval", async () => {
  const h = setup(),
    id = await paymentReady(h);
  assert.equal(
    h.data.aioDeveloperInvoices.alice[id].status,
    "payment_submitted",
  );
  assert.equal(h.data.aioDeveloperBilling, undefined);
  assert.ok(h.mails.some((m) => m.subject?.includes(id)));
  assert.equal(h.data.aioDeveloperInvoiceQueue[id].status, "payment_submitted");
  h.setAdmin(false);
  assert.equal((await h.call(ADMIN, approve(id))).status, 403);
  assert.equal(h.data.aioDeveloperBilling, undefined);
});
test("invoice approval requires submitted payment and the exact received USD quote", async () => {
  const h = setup(),
    id = await paymentReady(h, { noSubmit: true });
  assert.equal((await h.call(ADMIN, approve(id))).status, 409);
  await h.call(ACCOUNT, {
    action: "submit-payment",
    invoiceId: id,
    reference: "claimed-reference",
    method: "Bank transfer",
    confirmed: true,
    termsAccepted: true,
  });
  assert.equal(
    (await h.call(ADMIN, approve(id, { receivedUsdCents: 999 }))).status,
    409,
  );
  assert.equal(
    h.data.aioDeveloperInvoices.alice[id].status,
    "payment_submitted",
  );
  assert.equal(h.data.aioDeveloperBilling, undefined);
});
test("retrying a successful payment approval is idempotent and server-side credit quantity wins", async () => {
  const h = setup(),
    id = await paymentReady(h);
  const r = await h.call(ADMIN, approve(id, { credits: 100000 }));
  assert.equal(r.status, 200);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 10000000);
  assert.equal((await h.call(ADMIN, approve(id))).status, 200);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 10000000);
  assert.equal(h.data.aioDeveloperInvoices.alice[id].status, "credited");
});
test("approval resumes after credits were recorded but invoice finalization was interrupted", async () => {
  const h = setup(),
    id = await paymentReady(h),
    pay = h.load("lib/developers/payments.ts"),
    gid = h.mod.hash("invoice:" + id);
  h.data.aioDeveloperInvoices.alice[id].status = "approving";
  h.data.aioDeveloperInvoices.alice[id].approval = {
    reference: "verified-receipt",
    receivedUsdCents: 1000,
  };
  await pay.recordCredit(
    "alice",
    gid,
    10000000,
    "test-admin",
    "verified-receipt",
    "Payment verified",
  );
  assert.equal((await h.call(ADMIN, approve(id))).status, 200);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 10000000);
  assert.equal(h.data.aioDeveloperInvoices.alice[id].status, "credited");
});
test("receipt references cannot fund two accounts, and a conflict leaves the new invoice reviewable", async () => {
  const h = setup(),
    id = await paymentReady(h),
    pay = h.load("lib/developers/payments.ts");
  await pay.recordCredit(
    "bob",
    "another-grant",
    10000000,
    "test-admin",
    "verified-receipt",
    "Other account transfer",
  );
  assert.equal((await h.call(ADMIN, approve(id))).status, 409);
  assert.equal(
    h.data.aioDeveloperInvoices.alice[id].status,
    "payment_submitted",
  );
  assert.equal(h.data.aioDeveloperBilling.alice, undefined);
});
test("a customer cannot submit or cancel another account’s payment request", async () => {
  const h = setup(),
    id = await paymentReady(h, { noSubmit: true });
  h.data.aioDeveloperAccounts.bob.status = "approved";
  assert.equal(
    (
      await h.call(
        ACCOUNT,
        {
          action: "submit-payment",
          invoiceId: id,
          reference: "not-my-payment",
          method: "Bank transfer",
          confirmed: true,
          termsAccepted: true,
        },
        { token: "bob" },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await h.call(
        ACCOUNT,
        { action: "cancel-invoice", invoiceId: id },
        { token: "bob" },
      )
    ).status,
    404,
  );
  assert.equal(
    h.data.aioDeveloperInvoices.alice[id].status,
    "awaiting_payment",
  );
});
test("unpaid cancellation closes the request, while submitted payments require staff review", async () => {
  const h = setup(),
    id = await paymentReady(h, { noSubmit: true });
  assert.equal(
    (await h.call(ACCOUNT, { action: "cancel-invoice", invoiceId: id })).status,
    200,
  );
  assert.equal((await h.call(ADMIN, approve(id))).status, 409);
  const h2 = setup(),
    id2 = await paymentReady(h2);
  assert.equal(
    (await h2.call(ACCOUNT, { action: "cancel-invoice", invoiceId: id2 }))
      .status,
    409,
  );
});
test("new payment terms require explicit acceptance and outdated API terms block generation", async () => {
  const h = setup();
  assert.equal(
    (await h.call(ACCOUNT, { action: "invoice", credits: 10 })).status,
    400,
  );
  const key = await funded(h);
  h.data.aioDeveloperAccounts.alice.termsVersion = "old";
  assert.equal((await h.call(CHAT, input, { token: key })).status, 403);
  assert.equal(h.calls(), 0);
  assert.equal(
    (await h.call(ACCOUNT, { action: "accept-terms", accepted: true })).status,
    200,
  );
  assert.equal((await h.call(CHAT, input, { token: key })).status, 200);
});
test("console playground uses the same metered engine without minting or exposing an API key", async () => {
  const h = setup();
  await h.mod.grant(
    "alice",
    "test-funds",
    1000000,
    "test-admin",
    "demo-credit",
    "Authorized test grant",
  );
  const r = await h.call(PLAYGROUND, input, {
    headers: { "idempotency-key": "playground-request-001" },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.billing.charged_units, 8000);
  assert.equal(h.calls(), 1);
  assert.equal(h.data.aioDeveloperKeys, undefined);
  assert.equal(
    Object.values(h.data.aioDeveloperUsage.alice)[0].keyId,
    "console-playground",
  );
  assert.equal(
    (
      await h.call(PLAYGROUND, input, {
        headers: { "idempotency-key": "playground-request-001" },
      })
    ).status,
    409,
  );
  assert.equal(h.calls(), 1);
});
test("playground cannot bypass approval, wallet funding, origin checks, or refunds", async () => {
  const h = setup();
  assert.equal((await h.call(PLAYGROUND, input)).status, 402);
  assert.equal((await h.call(PLAYGROUND, input, { token: "bob" })).status, 403);
  assert.equal(
    (await h.call(PLAYGROUND, input, { origin: "https://evil.test" })).status,
    403,
  );
  assert.equal(h.calls(), 0);
  await funded(h);
  h.failProvider();
  assert.equal((await h.call(PLAYGROUND, input)).status, 502);
  assert.equal(h.data.aioDeveloperBilling.alice.balance, 1000000);
});
const INTEGRATIONS = "app/api/developers/integrations/route.ts";
process.env.EMAIL_QUEUE_KEY = "test-only-developer-events-key";
test("daily/monthly limits include concurrent holds across all keys and the playground", async () => {
  const h = setup();
  const key = await funded(h);
  assert.equal(
    (
      await h.call(INTEGRATIONS, {
        action: "spending",
        controls: {
          dailyUnits: 100,
          monthlyUnits: 200,
          lowBalanceUnits: 1,
          emailAlerts: false,
        },
      })
    ).status,
    200,
  );
  await h.mod.reserve(
    "alice",
    "budget-hold-1",
    80,
    "aio-2",
    "key-a",
    30,
    "test",
  );
  await assert.rejects(
    h.mod.reserve("alice", "budget-hold-2", 30, "aio-2", "key-b", 30, "test"),
    (e) => e.code === "daily_limit",
  );
  await h.mod.settle(
    "alice",
    "budget-hold-1",
    { prompt_tokens: 1, completion_tokens: 1 },
    20,
  );
  await h.mod.reserve(
    "alice",
    "budget-hold-3",
    80,
    "aio-2",
    "key-b",
    30,
    "test",
  );
  await h.mod.settle("alice", "budget-hold-3");
  assert.equal((await h.call(PLAYGROUND, input)).status, 402);
  assert.equal((await h.call(CHAT, input, { token: key })).status, 402);
  const w = await h.mod.wallet("alice");
  assert.equal(w.dailySpent, 20);
  assert.equal(w.dailyReserved, 0);
});
test("monthly limits survive UTC day rollover and expired holds release reserved budget", async () => {
  const h = setup();
  await funded(h);
  const month = new Date().toISOString().slice(0, 7),
    yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const v = h.data.aioDeveloperBilling.alice;
  v.controls = {
    dailyUnits: 100,
    monthlyUnits: 100,
    lowBalanceUnits: 0,
    emailAlerts: false,
  };
  v.spendDays = { [yesterday]: 90 };
  v.spendMonths = { [month]: 90 };
  await assert.rejects(
    h.mod.reserve("alice", "month-limit", 20, "aio-2", "a", 30, "test"),
    (e) => e.code === "monthly_limit",
  );
  v.spendMonths[month] = 0;
  await h.mod.reserve("alice", "old-hold", 90, "aio-2", "a", 30, "test");
  h.data.aioDeveloperBilling.alice.requests["old-hold"].expiresAt =
    Date.now() - 1;
  await h.mod.wallet("alice");
  await h.mod.reserve("alice", "new-hold", 90, "aio-2", "b", 30, "test");
});
test("negative limits are rejected, blank/null is unlimited, and zero pauses spending", async () => {
  const h = setup();
  await funded(h);
  assert.equal(
    (
      await h.call(INTEGRATIONS, {
        action: "spending",
        controls: {
          dailyUnits: -1,
          monthlyUnits: null,
          lowBalanceUnits: 1,
          emailAlerts: false,
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await h.call(INTEGRATIONS, {
        action: "spending",
        controls: {
          dailyUnits: 0,
          monthlyUnits: null,
          lowBalanceUnits: 1,
          emailAlerts: false,
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (await h.call(PLAYGROUND, input)).body.error.type,
    "daily_limit",
  );
  assert.equal(
    (
      await h.call(INTEGRATIONS, {
        action: "spending",
        controls: {
          dailyUnits: null,
          monthlyUnits: null,
          lowBalanceUnits: 1,
          emailAlerts: false,
        },
      })
    ).status,
    200,
  );
  assert.equal((await h.call(PLAYGROUND, input)).status, 200);
});
test("key model, CIDR and expiry restrictions are enforced before provider use", async () => {
  const h = setup();
  await funded(h);
  const made = await h.call(KEYS, {
    action: "create",
    name: "Restricted",
    permissions: {
      models: ["aio-2"],
      allowedIps: ["8.8.8.0/24"],
      expiresAt: Date.now() + 60000,
    },
  });
  assert.equal(made.status, 201);
  const token = made.body.secret;
  assert.equal(
    (
      await h.call(
        CHAT,
        { ...input, model: "aio-2" },
        { token, headers: { "x-forwarded-for": "1.1.1.1" } },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await h.call(CHAT, input, {
        token,
        headers: { "x-forwarded-for": "8.8.8.8" },
      })
    ).body.error.type,
    "model_not_allowed",
  );
  assert.equal(h.calls(), 0);
  assert.equal(
    (
      await h.call(
        CHAT,
        { ...input, model: "aio-2" },
        { token, headers: { "x-forwarded-for": "8.8.8.8" } },
      )
    ).status,
    200,
  );
  h.data.aioDeveloperKeyIndex[made.body.id].permissions.expiresAt =
    Date.now() - 1;
  assert.equal(
    (
      await h.call(
        CHAT,
        { ...input, model: "aio-2" },
        { token, headers: { "x-forwarded-for": "8.8.8.8" } },
      )
    ).body.error.type,
    "expired_api_key",
  );
});
test("key restrictions cannot be edited by another owner and revoked keys cannot be revived", async () => {
  const h = setup(),
    made = await h.call(KEYS, { action: "create", name: "Private" });
  h.data.aioDeveloperAccounts.bob.status = "approved";
  const update = {
    action: "permissions",
    id: made.body.id,
    permissions: { models: ["aio-2-fast"], allowedIps: [], expiresAt: null },
  };
  assert.equal((await h.call(KEYS, update, { token: "bob" })).status, 404);
  assert.equal((await h.call(KEYS, update)).status, 200);
  await h.call(KEYS, { action: "revoke", id: made.body.id });
  assert.equal((await h.call(KEYS, update)).status, 404);
  assert.equal(
    (
      await h.call(KEYS, {
        action: "create",
        name: "Bad",
        permissions: { models: [], allowedIps: [], expiresAt: null },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await h.call(KEYS, {
        action: "create",
        name: "Bad",
        permissions: {
          models: ["aio-2"],
          allowedIps: ["8.8.8.8/99"],
          expiresAt: null,
        },
      })
    ).status,
    400,
  );
});
test("IP parsing handles IPv6/CIDR and production without a trusted Vercel edge fails closed", () => {
  const h = setup(),
    p = h.load("lib/developers/controls.ts");
  assert.equal(p.ipAllowed("2001:4860:4860::8888", ["2001:4860::/32"]), true);
  assert.equal(p.ipAllowed("::ffff:8.8.8.8", ["8.8.8.8"]), true);
  assert.equal(p.ipAllowed("8.8.8.8", ["1.1.1.1"]), false);
  const previous = process.env.NODE_ENV,
    vercel = process.env.VERCEL;
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL;
  assert.equal(
    p.requestIp(
      new Request("https://example.test", {
        headers: { "x-forwarded-for": "8.8.8.8" },
      }),
    ),
    "",
  );
  if (previous === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous;
  if (vercel !== undefined) process.env.VERCEL = vercel;
});
test("low-balance email and webhook events are emitted once, not for temporary holds, and re-arm on top-up", async () => {
  const h = setup();
  await funded(h, 1000000);
  await h.call(INTEGRATIONS, {
    action: "spending",
    controls: {
      dailyUnits: null,
      monthlyUnits: null,
      lowBalanceUnits: 995000,
      emailAlerts: true,
    },
  });
  const configured = await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/aio",
    events: ["balance.low"],
  });
  assert.equal(configured.status, 200);
  await h.mod.reserve("alice", "temporary", 800000, "aio-2", "key", 30, "test");
  assert.equal(h.mails.filter(m => m.subject === "AIO API low-balance alert").length, 0);
  await h.mod.settle("alice", "temporary");
  const response = await h.call(PLAYGROUND, input);
  assert.equal(response.status, 200);
  assert.equal(h.webhookPosts.length, 1);
  assert.equal(JSON.parse(h.webhookPosts[0].raw).type, "balance.low");
  assert.equal(
    h.mails.filter((m) => m.subject === "AIO API low-balance alert").length,
    1,
  );
  await h.call(PLAYGROUND, input);
  assert.equal(h.webhookPosts.length, 1);
  await h.mod.grant(
    "alice",
    "topup",
    1000000,
    "admin",
    "topup-reference",
    "Verified top-up",
  );
  h.data.aioDeveloperBilling.alice.balance = 996000;
  await h.call(PLAYGROUND, input);
  assert.equal(h.webhookPosts.length, 2);
});
test("webhook signing secrets are encrypted, shown once, and delivery signatures verify exact bytes", async () => {
  const h = setup();
  const saved = await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/aio",
    events: ["payment.approved"],
  });
  assert.equal(saved.status, 200);
  assert.match(saved.body.secret, /^whsec_/);
  assert.equal(JSON.stringify(h.data).includes(saved.body.secret), false);
  const list = await h.call(INTEGRATIONS);
  assert.equal(JSON.stringify(list.body).includes(saved.body.secret), false);
  assert.equal(list.body.webhook.secretCipher, undefined);
  await h.call(INTEGRATIONS, { action: "test-webhook" });
  assert.equal(h.webhookPosts.length, 1);
  const sent = h.webhookPosts[0],
    crypto = require("node:crypto");
  const expected =
    "v1=" +
    crypto
      .createHmac("sha256", saved.body.secret)
      .update(sent.headers["AIO-Webhook-Timestamp"] + "." + sent.raw)
      .digest("hex");
  assert.equal(sent.headers["AIO-Webhook-Signature"], expected);
  assert.equal(JSON.parse(sent.raw).id, sent.headers["AIO-Webhook-Id"]);
});
test("webhook failures remain queued and owner retries deliver without sending a second email", async () => {
  const h = setup();
  await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/aio",
    events: ["balance.low"],
  });
  h.failWebhook();
  const queued = await h.call(INTEGRATIONS, { action: "test-webhook" }),
    id = queued.body.id;
  assert.equal(h.data.aioDeveloperEventQueue[id].status, "queued");
  assert.equal(h.data.aioDeveloperEventQueue[id].webhook.attempts, 1);
  h.failWebhook(false);
  assert.equal(
    (await h.call(INTEGRATIONS, { action: "retry-event", id })).status,
    200,
  );
  assert.equal(h.data.aioDeveloperEventQueue[id].webhook.state, "delivered");
  assert.equal(h.webhookPosts.length, 1);
  h.data.aioDeveloperAccounts.bob.status = "approved";
  assert.equal(
    (
      await h.call(
        INTEGRATIONS,
        { action: "retry-event", id },
        { token: "bob" },
      )
    ).status,
    400,
  );
});
test("old webhook configurations cancel pending delivery after rotation", async () => {
  const h = setup();
  await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/aio",
    events: ["balance.low"],
  });
  h.failWebhook();
  const queued = await h.call(INTEGRATIONS, { action: "test-webhook" }),
    id = queued.body.id;
  const rotated = await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/new",
    events: ["balance.low"],
    rotate: true,
  });
  assert.ok(rotated.body.secret);
  h.failWebhook(false);
  h.data.aioDeveloperEventQueue[id].nextAttemptAt = 0;
  const events = h.load("lib/developers/events.ts");
  await events.deliverEvent(id);
  assert.equal(h.data.aioDeveloperEventQueue[id].webhook.state, "cancelled");
  assert.equal(h.webhookPosts.length, 0);
});
test("webhook network policy rejects private, loopback, metadata, reserved and redirect-friendly URLs", () => {
  const h = setup();
  delete h.mocks["./webhook-network"];
  delete h.mocks["@/lib/developers/webhook-network"];
  const policy = h.load("lib/developers/webhook-network.ts");
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])
    assert.equal(policy.publicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(policy.publicAddress(ip), true, ip);
  for (const url of [
    "http://hooks.example.com",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://metadata.internal/x",
    "https://user:password@hooks.example.com/x",
    "https://hooks.example.com:8443/x",
    "https://hooks.example.com/x#fragment",
  ])
    assert.throws(() => policy.webhookUrl(url));
});
test("usage charts summarize real charges, failures, tokens and latency without prompt text", async () => {
  const h = setup();
  await funded(h);
  await h.call(PLAYGROUND, input);
  h.failProvider();
  await h.call(PLAYGROUND, input);
  const r = await h.call("app/api/developers/analytics/route.ts");
  assert.equal(r.status, 200);
  assert.equal(r.body.totals.requests, 2);
  assert.equal(r.body.totals.errors, 1);
  assert.equal(r.body.totals.chargedUnits, 8000);
  assert.equal(r.body.totals.inputTokens, 20);
  assert.equal(r.body.totals.outputTokens, 30);
  assert.equal(r.body.days.length, 30);
  assert.equal(r.body.period.timezone, "UTC");
  assert.equal(JSON.stringify(r.body).includes("Test answer"), false);
});
test("receipts require a confirmed paid invoice and matching grant, with owner/admin authorization", async () => {
  const h = setup(),
    id = await paymentReady(h),
    receipt = h.load("lib/developers/receipt.ts");
  await assert.rejects(
    receipt.paymentReceipt("alice", id),
    (e) => e.status === 409,
  );
  await h.call(ADMIN, approve(id));
  const content = await receipt.paymentReceipt("alice", id);
  assert.match(content.markdown, /US\$10\.00/);
  assert.match(content.markdown, /Credits added:\*\* 10/);
  assert.match(content.markdown, /not a tax invoice/);
  await assert.rejects(
    receipt.paymentReceipt("bob", id),
    (e) => e.status === 404,
  );
  const route = h.load("app/api/developers/receipts/[id]/route.ts");
  const own = await route.GET(
    new Request("http://localhost/api", {
      headers: { authorization: "Bearer alice" },
    }),
    { params: { id } },
  );
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "application/pdf");
  h.setAdmin(false);
  const blocked = await route.GET(
    new Request("http://localhost/api?uid=alice", {
      headers: { authorization: "Bearer bob" },
    }),
    { params: { id } },
  );
  assert.equal(blocked.status, 403);
});
test("payment approval emits one signed webhook even when approval is retried", async () => {
  const h = setup();
  await h.call(INTEGRATIONS, {
    action: "webhook",
    enabled: true,
    url: "https://hooks.example.com/aio",
    events: ["payment.approved"],
  });
  const id = await paymentReady(h);
  assert.equal((await h.call(ADMIN, approve(id))).status, 200);
  assert.equal(h.webhookPosts.length, 1);
  assert.equal(JSON.parse(h.webhookPosts[0].raw).data.credits, 10);
  await h.call(ADMIN, approve(id));
  assert.equal(h.webhookPosts.length, 1);
});
test("published API notices are public while drafts stay private and require admin writes", async () => {
  const h = setup(),
    notice = {
      action: "notice",
      title: "Model deprecation notice",
      body: "This model alias will be replaced on the effective date.",
      version: "API v1",
      type: "deprecation",
      published: false,
      effectiveAt: Date.now() + 86400000,
    };
  assert.equal((await h.call(ADMIN, notice)).status, 200);
  let publicNotes = await h.call("app/api/developers/changelog/route.ts");
  assert.equal(publicNotes.body.notices.length, 0);
  const id = Object.keys(h.data.aioApiNotices)[0];
  assert.equal(
    (await h.call(ADMIN, { ...notice, id, published: true })).status,
    200,
  );
  publicNotes = await h.call("app/api/developers/changelog/route.ts");
  assert.equal(publicNotes.body.notices.length, 1);
  assert.equal(publicNotes.body.notices[0].updatedBy, undefined);
  h.setAdmin(false);
  assert.equal(
    (await h.call(ADMIN, { ...notice, published: true }, { token: "bob" }))
      .status,
    403,
  );
});
test("webhook transport rejects private DNS answers, pins a public IP with TLS validation, and never follows redirects", async () => {
  const h = setup();
  delete h.mocks["./webhook-network"];
  delete h.mocks["@/lib/developers/webhook-network"];
  let addresses = [{ address: "127.0.0.1", family: 4 }],
    requests = 0,
    status = 204,
    captured;
  h.mocks["dns/promises"] = { lookup: async () => addresses };
  const { EventEmitter } = require("node:events");
  h.mocks["https"] = {
    request: (url, options, callback) => {
      requests++;
      captured = { url, options };
      const req = new EventEmitter();
      req.end = () => callback({ statusCode: status, resume() {} });
      return req;
    },
  };
  const network = h.load("lib/developers/webhook-network.ts");
  await assert.rejects(
    network.postWebhook("https://hooks.example.com/x", "{}", {}),
  );
  assert.equal(requests, 0);
  addresses = [
    { address: "8.8.8.8", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ];
  await assert.rejects(
    network.postWebhook("https://hooks.example.com/x", "{}", {}),
  );
  assert.equal(requests, 0);
  addresses = [{ address: "8.8.8.8", family: 4 }];
  assert.equal(
    await network.postWebhook("https://hooks.example.com/x", "{}", {}),
    204,
  );
  assert.equal(captured.options.rejectUnauthorized, true);
  assert.equal(captured.options.servername, "hooks.example.com");
  captured.options.lookup("hooks.example.com", {}, (error, ip, family) => {
    assert.equal(error, null);
    assert.equal(ip, "8.8.8.8");
    assert.equal(family, 4);
  });
  status = 302;
  await assert.rejects(
    network.postWebhook("https://hooks.example.com/x", "{}", {}),
  );
  assert.equal(requests, 2);
});
test(
  "Vercel background delivery does not block a settled API response",
  { timeout: 5000 },
  async () => {
    const h = setup(),
      tasks = [];
    h.mocks["@vercel/functions"] = { waitUntil: (p) => tasks.push(p) };
    let release;
    const gate = new Promise((r) => (release = r));
    h.mocks["./webhook-network"].postWebhook = async () => {
      await gate;
      return 204;
    };
    await h.call(INTEGRATIONS, {
      action: "webhook",
      enabled: true,
      url: "https://hooks.example.com/aio",
      events: ["balance.low"],
    });
    await funded(h);
    const before = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      const result = await h.call(PLAYGROUND, input);
      assert.equal(result.status, 200);
      assert.equal(tasks.length, 1);
      release();
      await Promise.all(tasks);
    } finally {
      release();
      if (before === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = before;
    }
  },
);
test("the maintenance worker recovers credit-event outboxes after an interrupted response", async () => {
  const h = setup(),
    pay = h.load("lib/developers/payments.ts"),
    events = h.load("lib/developers/events.ts"),
    id = h.mod.hash("outbox-test");
  await pay.recordCredit(
    "alice",
    "receipt-outbox",
    1000000,
    "admin",
    "verified-outbox",
    "Verified transfer",
    {
      id,
      type: "payment.approved",
      createdAt: Date.now(),
      data: { credits: 1, amount_usd_cents: 100, currency: "USD" },
    },
  );
  assert.equal(h.data.aioDeveloperBilling.alice.hasPendingEvents, true);
  assert.ok(h.data.aioDeveloperBilling.alice.pendingEvents[id]);
  await events.drainDeveloperEvents();
  assert.equal(h.data.aioDeveloperBilling.alice.hasPendingEvents, false);
  assert.equal(h.data.aioDeveloperEventQueue[id].status, "completed");
});
test("profile suspension disables existing API keys as well as console access", async () => {
  const h = setup(),
    key = await funded(h);
  h.data.users = { alice: { status: "suspended" } };
  assert.equal((await h.call(CHAT, input, { token: key })).status, 403);
  assert.equal(h.calls(), 0);
});
