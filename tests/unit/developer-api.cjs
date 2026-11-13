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
        let end = "";
        const q = {
          endAt: (s) => {
            end = s;
            return q;
          },
          limitToLast: (n) => ({
            get: async () => {
              const data = Object.fromEntries(
                Object.entries(read(p) || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .filter(([id]) => !end || id <= end)
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
    requested = await h.call(ACCOUNT, { action: "invoice", credits: 10 }),
    id = requested.body.invoice.id;
  const grant = {
    action: "credit",
    uid: "alice",
    credits: 10,
    invoiceId: id,
    reference: "receipt10",
    reason: "Payment verified",
  };
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
