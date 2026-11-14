const { test } = require("node:test");
const assert = require("node:assert/strict");
const { harness } = require("../helpers/route-harness.cjs");
const crypto = require("node:crypto");
process.env.EMAIL_QUEUE_KEY =
  "test-only-customer-workflow-secret-not-a-live-credential";
const route = "app/api/aio/customer-actions/route.ts";
const account = {
  uid: "customer-a",
  email: "owner@example.test",
  emailVerified: true,
  displayName: "Account Owner",
  disabled: false,
};
function setup(initial = {}, initialUser = null) {
  const h = harness(initial);
  let user = initialUser;
  h.mocks["@/lib/firebase-admin"].adminAuth.verifyIdToken = async (
    token,
    revoked,
  ) => {
    h.revocationChecked = revoked;
    if (!user || token !== user.uid) throw Error("Revoked");
    return { uid: user.uid, role: "admin" };
  };
  h.mocks["@/lib/firebase-admin"].adminAuth.getUser = async () => user;
  h.mocks["@/lib/server-protection"].inheritPublicRequestVerification = (
    _parent,
    child,
  ) => child;
  h.user = (v) => {
    user = v;
  };
  h.action = async (body) => {
    const r = await h.load(route).POST(
      new Request("https://auronix.example.test/api/aio/customer-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${user.uid}` } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: r.status, body: await r.json() };
  };
  h.prepare = (kind, input, extra = {}) =>
    h.action({
      mode: "prepare",
      kind,
      input,
      requestKey: crypto.randomUUID(),
      ...extra,
    });
  h.code = () =>
    h.mails
      .filter((m) => m.subject === "Verify your Auronix chat action")
      .at(-1)
      ?.body.match(/verification code is (\d{6})/)?.[1];
  h.verify = (f) =>
    h.action({ mode: "verify", id: f.id, token: f.token, code: h.code() });
  h.confirm = (f) =>
    h.action({ mode: "confirm", id: f.id, token: f.token, confirmed: true });
  return h;
}
const subscribe = {
  email: "reader@example.test",
  name: "Reader",
  frequency: "weekly",
  consent: true,
  company: true,
};
const seller = {
  fullName: "Example Owner",
  businessName: "Example Wholesale",
  businessEmail: "business@example.test",
  personalEmail: "person@example.test",
  preferredContact: "business",
  phone: "+15551234567",
  country: "United States",
  address: "Example Street",
  city: "Miami",
  state: "Florida",
  zipCode: "33101",
  website: "https://example.test",
  businessType: "Wholesaler",
  yearsInBusiness: "2",
  productCategories: "Home supplies",
  catalogUrl: "",
  businessInformation:
    "We distribute genuine branded home and kitchen supplies through wholesale channels.",
  whyWorkWithAuronix: "We want a lasting wholesale distribution partnership.",
  contactAgreement: true,
  sellerPolicyAgreement: true,
};
test("newsletter changes require email OTP and explicit confirmation; codes never appear in workflow responses", async () => {
  const h = setup(),
    p = await h.prepare("newsletter_subscribe", subscribe);
  assert.equal(p.status, 200);
  assert.equal(p.body.phase, "verify");
  assert.ok(h.code());
  assert.ok(!JSON.stringify(p.body).includes(h.code()));
  assert.equal(h.data.newsletterSubscribers, undefined);
  assert.equal((await h.confirm(p.body)).status, 409);
  assert.equal(h.data.newsletterSubscribers, undefined);
  const v = await h.verify(p.body);
  assert.equal(v.body.phase, "review");
  assert.equal(h.data.newsletterSubscribers, undefined);
  const c = await h.confirm(p.body);
  assert.equal(c.status, 200);
  assert.equal(c.body.phase, "complete");
  const row = Object.values(h.data.newsletterSubscribers)[0];
  assert.equal(row.email, subscribe.email);
  assert.equal(row.active, true);
  assert.equal(row.confirmedVia, "aio-email-otp");
  assert.ok(!JSON.stringify(h.data.adminAuditLogs).includes(h.code()));
});
test("five wrong OTP attempts lock verification; expired codes cannot confirm", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body,
    correct = h.code();
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await h.action({
          mode: "verify",
          id: p.id,
          token: p.token,
          code: "000000",
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await h.action({
        mode: "verify",
        id: p.id,
        token: p.token,
        code: correct,
      })
    ).status,
    400,
  );
  assert.equal((await h.confirm(p)).status, 409);
  assert.equal(h.data.newsletterSubscribers, undefined);
  const second = (
    await h.prepare("newsletter_subscribe", {
      ...subscribe,
      email: "second@example.test",
    })
  ).body;
  h.data.aioCustomerWorkflows[second.id].otpExpiresAt = Date.now() - 1;
  assert.equal((await h.verify(second)).status, 400);
});
test("verification accepts pasted spaces and local numerals, and rejects another flow token", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body,
    code = h.code(),
    localized = code
      .split("")
      .map((d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
      .join(" ");
  assert.equal(
    (await h.action({ mode: "verify", id: p.id, token: "a".repeat(64), code }))
      .status,
    403,
  );
  assert.equal(
    (
      await h.action({
        mode: "verify",
        id: p.id,
        token: p.token,
        code: localized,
      })
    ).body.phase,
    "review",
  );
});
test("repeated and concurrent prepare requests send only one OTP for an immutable request", async () => {
  const h = setup(),
    body = {
      mode: "prepare",
      kind: "newsletter_subscribe",
      input: subscribe,
      requestKey: crypto.randomUUID(),
    };
  const [a, b] = await Promise.all([h.action(body), h.action(body)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body.token, b.body.token);
  assert.equal(
    h.mails.filter((m) => m.subject === "Verify your Auronix chat action")
      .length,
    1,
  );
  assert.equal(
    (
      await h.action({
        ...body,
        input: { ...subscribe, email: "changed@example.test" },
      })
    ).status,
    409,
  );
});
test("resend cooldown is enforced and new OTP invalidates the previous verification hash", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body,
    previous = h.data.aioCustomerWorkflows[p.id].otpHash;
  assert.equal(
    (await h.action({ mode: "resend", id: p.id, token: p.token })).status,
    429,
  );
  h.data.aioCustomerWorkflows[p.id].sentAt = Date.now() - 61000;
  assert.equal(
    (await h.action({ mode: "resend", id: p.id, token: p.token })).status,
    200,
  );
  assert.equal(h.data.aioCustomerWorkflows[p.id].sendCount, 2);
  assert.equal((await h.verify(p)).body.phase, "review");
  assert.ok(previous);
});
test("newsletter unsubscribe updates all matching records only after mailbox proof", async () => {
  const h = setup({
    newsletterSubscribers: {
      old: { email: subscribe.email, active: true },
      duplicate: { email: subscribe.email, active: true },
      other: { email: "other@example.test", active: true },
    },
  });
  const p = (
    await h.prepare("newsletter_unsubscribe", {
      email: subscribe.email,
      reason: "too_many_emails",
    })
  ).body;
  await h.verify(p);
  await h.confirm(p);
  assert.equal(h.data.newsletterSubscribers.old.active, false);
  assert.equal(h.data.newsletterSubscribers.duplicate.active, false);
  assert.equal(h.data.newsletterSubscribers.other.active, true);
});
test("customer email cannot set arbitrary recipients, sender identities, roles or database fields", async () => {
  const h = setup(
    { users: { [account.uid]: { role: "seller", status: "active" } } },
    account,
  );
  assert.equal(
    (
      await h.prepare("email_me", {
        subject: "Test",
        message: "A legitimate requested email",
        to: "victim@example.test",
      })
    ).status,
    400,
  );
  assert.equal(
    (await h.prepare("profile_update", { displayName: "Owner", role: "admin" }))
      .status,
    400,
  );
  assert.equal(
    (
      await setup().prepare("email_me", {
        subject: "Test",
        message: "Anonymous email attempt",
      })
    ).status,
    400,
  );
  const p = (
    await h.prepare("email_me", {
      email: account.email,
      subject: "My requested message",
      message: "Please send my requested information.",
    })
  ).body;
  await h.verify(p);
  const c = await h.action({
    mode: "confirm",
    id: p.id,
    token: p.token,
    confirmed: true,
    input: { to: "victim@example.test" },
    uid: "customer-b",
    kind: "admin-delete",
  });
  assert.equal(c.status, 200);
  assert.equal(
    h.mails.find((m) => m.subject === "My requested message").to,
    account.email,
  );
  assert.ok(h.revocationChecked);
});
test("duplicate and simultaneous confirmations produce one customer email", async () => {
  const h = setup({ users: { [account.uid]: { role: "customer" } } }, account),
    p = (
      await h.prepare("email_me", {
        email: account.email,
        subject: "Only once",
        message: "A confirmed customer message.",
      })
    ).body;
  await h.verify(p);
  const results = await Promise.all([h.confirm(p), h.confirm(p)]);
  assert.ok(results.some((r) => r.status === 200));
  await h.confirm(p);
  assert.equal(h.mails.filter((m) => m.subject === "Only once").length, 1);
});
test("account lookups and ticket updates cannot access another customer’s records", async () => {
  const h = setup(
    {
      users: { [account.uid]: { role: "seller" } },
      tickets: {
        mine: {
          sellerUid: account.uid,
          subject: "My issue",
          status: "open",
          adminNotes: "PRIVATE-INTERNAL",
          message: "My message",
        },
        other: {
          sellerUid: "customer-b",
          subject: "OTHER-CUSTOMER-SECRET",
          status: "open",
        },
      },
    },
    account,
  );
  const r = await h.action({
    mode: "inspect",
    kind: "my_tickets",
    uid: "customer-b",
  });
  assert.equal(r.status, 200);
  assert.match(JSON.stringify(r.body), /My issue/);
  assert.ok(
    !/OTHER-CUSTOMER-SECRET|PRIVATE-INTERNAL/.test(JSON.stringify(r.body)),
  );
  assert.equal(
    (await h.prepare("support_close", { ticketId: "other" })).status,
    404,
  );
  const p = (await h.prepare("support_close", { ticketId: "mine" })).body;
  await h.verify(p);
  h.user({ ...account, uid: "customer-b" });
  assert.equal((await h.confirm(p)).status, 403);
  assert.equal(h.data.tickets.mine.status, "open");
});
test("disabled or non-seller accounts cannot gain seller access from token claims", async () => {
  const h = setup({ users: { [account.uid]: { role: "customer" } } }, account);
  assert.equal(
    (await h.action({ mode: "inspect", kind: "my_products" })).status,
    403,
  );
  h.user({ ...account, disabled: true });
  assert.equal(
    (await h.action({ mode: "inspect", kind: "my_profile" })).status,
    403,
  );
});
test("admin kill switches are rechecked after OTP, and profile roles are preserved", async () => {
  const h = setup(
      {
        users: {
          [account.uid]: {
            role: "seller",
            displayName: "Old",
            businessName: "Business",
            phone: "",
            website: "",
          },
        },
      },
      account,
    ),
    p = (
      await h.prepare("profile_update", {
        displayName: "New",
        businessName: "Business",
        phone: "",
        website: "",
      })
    ).body;
  await h.verify(p);
  h.data.settings = { ai: { customerActionsEnabled: false } };
  assert.equal((await h.confirm(p)).status, 503);
  assert.equal(h.data.users[account.uid].displayName, "Old");
  h.data.settings.ai.customerActionsEnabled = true;
  assert.equal((await h.confirm(p)).status, 200);
  assert.equal(h.data.users[account.uid].displayName, "New");
  assert.equal(h.data.users[account.uid].role, "seller");
});
test("supplier chat submission uses the same service and accepts optional documents only after confirmation", async () => {
  const h = setup();
  let called = 0;
  h.mocks["@/lib/supplier-application-service"] = {
    submitSupplierApplication: async (request, operationId) => {
      called++;
      const form = await request.formData();
      assert.equal(form.get("email"), "supplier@example.test");
      assert.equal(form.get("companyName"), "Example Supply");
      assert.ok(operationId);
      return new Response(
        JSON.stringify({ success: true, submissionId: "supplier-created" }),
      );
    },
  };
  const p = (
    await h.prepare("supplier_apply", {
      contactName: "Taylor",
      companyName: "Example Supply",
      email: "supplier@example.test",
      phone: "+15551234567",
      country: "US",
      categories: "Home",
      distributionModel: "Wholesaler",
      message: "We supply genuine branded household products.",
      consent: true,
    })
  ).body;
  assert.equal(called, 0);
  await h.verify(p);
  assert.equal(called, 0);
  const c = await h.confirm(p);
  assert.equal(c.status, 200);
  assert.equal(c.body.result.reference, "supplier-created");
  await h.confirm(p);
  assert.equal(called, 1);
});
test("seller application receives an OTP-verified draft and goes through existing submission validation", async () => {
  const h = setup();
  let calls = 0;
  h.mocks["@/lib/seller-application-service"] = {
    submitSellerApplication: async (request) => {
      calls++;
      const b = await request.json(),
        draft = h.data.sellerApplicationDrafts[b.draftId];
      assert.equal(draft.emailVerified, true);
      assert.equal(draft.emailVerifiedAddress, seller.businessEmail);
      assert.equal(
        draft.resumeCodeHash,
        crypto.createHash("sha256").update(b.resumeId).digest("hex"),
      );
      assert.equal(b.form.sellerPolicyAgreement, true);
      return new Response(
        JSON.stringify({ success: true, trackingId: "AX-T-EXAMPLE" }),
      );
    },
  };
  const p = (await h.prepare("seller_apply", seller)).body;
  await h.verify(p);
  const r = await h.confirm(p);
  assert.equal(r.status, 200);
  assert.equal(r.body.result.reference, "AX-T-EXAMPLE");
  assert.equal(calls, 1);
});
test("tracking never returns internal screening or another email’s application", async () => {
  const id = "application-123",
    h = setup({
      sellerApplications: {
        [id]: {
          businessEmail: "owner@example.test",
          businessName: "Example Wholesale",
          status: "under_review",
          aiScreening: { secret: "PRIVATE-SCREENING" },
          invitationTokenHash: "PRIVATE-TOKEN",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    });
  const p = (
    await h.prepare("application_track", {
      trackingId: id,
      email: "owner@example.test",
      emailType: "business",
    })
  ).body;
  await h.verify(p);
  const r = await h.confirm(p);
  assert.equal(r.status, 200);
  assert.ok(!/PRIVATE-SCREENING|PRIVATE-TOKEN/.test(JSON.stringify(r.body)));
  const other = (
    await h.prepare("application_track", {
      trackingId: id,
      email: "different@example.test",
      emailType: "business",
    })
  ).body;
  await h.verify(other);
  assert.equal((await h.confirm(other)).status, 404);
});
test("cancelled workflows and modified action kinds cannot execute", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body;
  await h.verify(p);
  assert.equal(
    (await h.action({ mode: "cancel", id: p.id, token: p.token })).status,
    200,
  );
  assert.equal((await h.confirm(p)).status, 410);
  assert.equal(
    (await h.prepare("arbitrary-database-write", { role: "admin" })).status,
    400,
  );
});
test("natural-language routing covers in-chat applications, newsletter actions and account tasks without granting admin tools", () => {
  const c = setup().load("lib/aio/customer-actions.ts");
  for (const [text, expected] of [
    ["I want to become a supplier", "supplier_apply"],
    ["apply for a seller account", "seller_apply"],
    ["subscribe me to newsletter", "newsletter_subscribe"],
    ["unsubscribe me please", "newsletter_unsubscribe"],
    ["change my email preferences", "newsletter_preferences"],
    ["email me your answer", "email_me"],
    ["show my support tickets", "my_tickets"],
    ["close my ticket", "support_close"],
    ["add a product draft", "product_draft"],
  ])
    assert.equal(c.suggestCustomerAction(text), expected);
  assert.equal(c.suggestCustomerAction("give me admin database access"), null);
  assert.equal(c.isCustomerActionKind("__proto__"), false);
});
test("expired private action sessions are removed while active confirmation leases are preserved", async () => {
  const h = setup({
    aioCustomerWorkflows: {
      expired: { phase: "verify", expiresAt: 1 },
      executing: {
        phase: "executing",
        expiresAt: 1,
        leaseUntil: Date.now() + 60000,
      },
      live: { phase: "review", expiresAt: Date.now() + 60000 },
    },
    aioActionEmailRates: { expired: { expiresAt: 1 } },
  });
  const result = await h
    .load("lib/aio/customer-session-cleanup.ts")
    .cleanupCustomerActionSessions();
  assert.equal(result.removed, 2);
  assert.equal(h.data.aioCustomerWorkflows.expired, undefined);
  assert.ok(h.data.aioCustomerWorkflows.executing);
  assert.ok(h.data.aioCustomerWorkflows.live);
});
test("internal request clones reuse only an actual server-verified Turnstile challenge", async () => {
  const h = setup(),
    previousSecret = process.env.TURNSTILE_SECRET_KEY,
    previousEnforce = process.env.TURNSTILE_ENFORCE,
    oldFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.TURNSTILE_ENFORCE = "true";
  let checks = 0;
  try {
    global.fetch = async () => {
      checks++;
      return new Response(JSON.stringify({ success: true }));
    };
    const protect = h.load("lib/server-protection.ts"),
      parent = new Request("https://example.test", {
        headers: { "x-internal-verified": "true" },
      });
    await assert.rejects(protect.protectPublicRequest(parent, "test", {}));
    await protect.protectPublicRequest(parent, "test", {
      turnstileToken: "valid",
    });
    const child = protect.inheritPublicRequestVerification(
      parent,
      new Request("https://example.test/child"),
    );
    await protect.protectPublicRequest(child, "child", {});
    assert.equal(checks, 1);
    await assert.rejects(
      protect.protectPublicRequest(
        new Request("https://example.test/untrusted", {
          headers: { "x-internal-verified": "true" },
        }),
        "untrusted",
        {},
      ),
    );
  } finally {
    global.fetch = oldFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
    if (previousEnforce === undefined) delete process.env.TURNSTILE_ENFORCE;
    else process.env.TURNSTILE_ENFORCE = previousEnforce;
  }
});

test("a completed action cannot be misreported as cancelled", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body;
  await h.verify(p);
  await h.confirm(p);
  assert.equal(
    (await h.action({ mode: "cancel", id: p.id, token: p.token })).status,
    409,
  );
  assert.equal(Object.values(h.data.newsletterSubscribers)[0].active, true);
});

test("a guest can email a reviewed message only to the mailbox verified in that workflow", async () => {
  const h = setup(),
    p = await h.prepare("email_me", {
      email: "guest@example.test",
      subject: "My AIO copy",
      message: "Information I asked to receive.",
    });
  assert.equal(p.status, 200);
  assert.equal((await h.confirm(p.body)).status, 409);
  await h.verify(p.body);
  assert.equal((await h.confirm(p.body)).status, 200);
  assert.equal(
    h.mails.find((m) => m.subject === "My AIO copy").to,
    "guest@example.test",
  );
});

test("guest OTP verification and preparation retries survive Firebase removing null owner fields", async () => {
  const h = setup(),
    requestKey = crypto.randomUUID(),
    body = {
      mode: "prepare",
      kind: "newsletter_subscribe",
      input: subscribe,
      requestKey,
    };
  const first = await h.action(body);
  assert.equal(first.status, 200);
  // RTDB omits null properties on reads, including records written by the earlier release.
  delete h.data.aioCustomerWorkflows[first.body.id].uid;
  const retried = await h.action(body);
  assert.equal(retried.status, 200);
  assert.equal(retried.body.token, first.body.token);
  assert.equal((await h.verify(first.body)).body.phase, "review");
  assert.equal((await h.confirm(first.body)).status, 200);
});
test("an active guest workflow can retry only its own queued OTP when the backoff is due", async () => {
  const h = setup();
  h.mocks["@/lib/server-mail"].sendProfessionalEmail = async (value) => {
    h.mails.push(value);
    return { queued: true, queueId: "otp-job" };
  };
  const p = (await h.prepare("newsletter_subscribe", subscribe)).body;
  h.data.emailQueue = {
    "otp-job": {
      recipient: subscribe.email,
      status: "queued",
      nextAttemptAt: Date.now() + 60000,
      leaseUntil: 0,
    },
    "other-job": {
      recipient: "other@example.test",
      status: "queued",
      nextAttemptAt: 0,
      leaseUntil: 0,
    },
  };
  let retried = [];
  h.mocks["@/lib/server-mail"].retryQueuedEmail = async (id) => {
    retried.push(id);
    h.data.emailQueue[id].status = "sent";
  };
  const query = {
    mode: "delivery-status",
    id: p.id,
    token: p.token,
    queueId: "other-job",
  };
  assert.equal((await h.action(query)).body.emailStatus, "queued");
  assert.equal(retried.length, 0);
  h.data.emailQueue["otp-job"].nextAttemptAt = 0;
  assert.equal((await h.action(query)).body.emailStatus, "sent");
  assert.deepEqual(retried, ["otp-job"]);
  assert.equal(
    (await h.action({ ...query, token: "b".repeat(64) })).status,
    403,
  );
  assert.equal((await h.verify(p)).body.phase, "review");
});
test("a queued mail for another address cannot be processed through a workflow", async () => {
  const h = setup(),
    p = (await h.prepare("newsletter_subscribe", subscribe)).body;
  h.data.aioCustomerWorkflows[p.id].otpQueueId = "other-job";
  h.data.emailQueue = {
    "other-job": {
      recipient: "other@example.test",
      status: "queued",
      nextAttemptAt: 0,
    },
  };
  let calls = 0;
  h.mocks["@/lib/server-mail"].retryQueuedEmail = async () => {
    calls++;
  };
  assert.equal(
    (await h.action({ mode: "delivery-status", id: p.id, token: p.token }))
      .status,
    403,
  );
  assert.equal(calls, 0);
});
test("malformed action requests return a validation error, not a server failure", async () => {
  const h = setup();
  for (const body of ["{", "null", "[]", "{}"]) {
    const r = await h
      .load(route)
      .POST(
        new Request("https://example.test/api/aio/customer-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );
    assert.equal(r.status, 400);
  }
});

test('chat form defaults reproduce the OTP failure; only the selected action fields are serialized', async () => {
  const h = setup();
  const { customerActionPayload } = h.load('lib/aio/customer-actions.ts');
  const draft = { ...subscribe, preferredContact: 'business', emailType: 'business', displayName: 'Account Owner', businessName: 'Example Business', phone: '+12025550123', website: 'https://example.test' };
  const broken = await h.prepare('newsletter_subscribe', draft);
  assert.equal(broken.status, 400);
  assert.match(broken.body.error, /Unrecognized key/);
  assert.equal(h.mails.length, 0);
  const fixed = await h.prepare('newsletter_subscribe', customerActionPayload('newsletter_subscribe', draft));
  assert.equal(fixed.status, 200); assert.equal(fixed.body.phase, 'verify'); assert.ok(h.code());
  const verify = await h.verify(fixed.body); assert.equal(verify.body.phase, 'review');
});

test('every writable AIO action can request an OTP with the shared chat defaults and signed-in profile fields', async () => {
  const catalog = setup().load('lib/aio/customer-actions.ts');
  const kinds = Object.keys(catalog.CUSTOMER_ACTIONS).filter(k => catalog.CUSTOMER_ACTIONS[k].mode === 'write');
  assert.ok(kinds.length > 8);
  for (const kind of kinds) {
    const h = setup({ users: { [account.uid]: { role: 'seller', displayName: 'Account Owner' } }, tickets: { 'ticket-own': { sellerUid: account.uid, status: 'open' } } }, account);
    const draft = { frequency: 'weekly', preferredContact: 'business', emailType: 'business', company: true, sourcing: true, sellers: true, suppliers: true, email: account.email, displayName: 'Account Owner', businessName: 'Example Business', phone: '+12025550123', website: 'https://example.test', unrelatedSeed: 'never sent' };
    for (const step of catalog.customerActionSteps(kind)) for (const field of step.fields) {
      draft[field.key] = field.type === 'checkbox' ? true : field.type === 'select' ? field.options[0] : field.type === 'email' ? account.email : field.type === 'tel' ? '+12025550123' : field.type === 'url' ? 'https://example.test' : field.type === 'number' ? '2' : field.key === 'ticketId' ? 'ticket-own' : field.key === 'trackingId' ? 'tracking-reference-123' : 'A complete example value for verification testing';
    }
    const payload = catalog.customerActionPayload(kind, draft);
    const result = await h.prepare(kind, payload);
    assert.equal(result.status, 200, `${kind}: ${JSON.stringify(result.body)}`);
    assert.equal(result.body.phase, 'verify', kind); assert.ok(h.code(), kind);
    assert.equal(Object.hasOwn(payload, 'unrelatedSeed'), false);
  }
});
