const { test } = require("node:test");
const assert = require("node:assert/strict");
const { harness } = require("../helpers/route-harness.cjs");
const crypto = require("node:crypto");
process.env.EMAIL_QUEUE_KEY = "test-queue-key-with-no-real-secrets";
const message = {
  sender: "support@example.test",
  options: {
    to: "customer@example.test",
    subject: "Reset your password",
    html: "Secret reset-token-123",
    expiresAt: Date.now() + 600000,
  },
};
test("mail queue encrypts payloads, records retry state, and never exposes bodies in delivery summaries", async () => {
  const h = harness(),
    q = h.load("lib/mail-queue.ts");
  const id = await q.enqueueMail(message);
  assert.ok(!JSON.stringify(h.data.emailQueue[id]).includes("reset-token-123"));
  const result = await q.processMailJob(id, async () => {
    throw Object.assign(Error("network contains secret"), {
      code: "ETIMEDOUT",
    });
  });
  assert.equal(result.queued, true);
  assert.equal(h.data.emailQueue[id].attempts, 1);
  assert.equal(h.data.emailQueue[id].status, "queued");
  assert.ok(h.data.emailQueue[id].nextAttemptAt > Date.now());
  assert.equal(h.data.emailAlerts[id].resolved, false);
  const summary = q.publicMailJob(id, h.data.emailQueue[id]);
  assert.equal(summary.payload, undefined);
  assert.equal(summary.lastError, "ETIMEDOUT");
});
test("mail queue leases prevent concurrent sends and stable keys prevent duplicate enqueue", async () => {
  const h = harness(),
    q = h.load("lib/mail-queue.ts");
  const mail = {
    ...message,
    options: { ...message.options, idempotencyKey: "one-ticket-reply" },
  };
  const a = await q.enqueueMail(mail),
    b = await q.enqueueMail(mail);
  assert.equal(a, b);
  let calls = 0;
  const send = async (m) => {
    calls++;
    assert.equal(m.options.html, message.options.html);
    return { messageId: "provider-1" };
  };
  await Promise.all([q.processMailJob(a, send), q.processMailJob(b, send)]);
  assert.equal(calls, 1);
  assert.equal(h.data.emailQueue[a].status, "sent");
  assert.equal(h.data.emailQueue[a].payload, null);
  await q.processMailJob(await q.enqueueMail(mail), send);
  assert.equal(calls, 1);
});
test("expired codes and permanent recipient errors stop retries and raise admin alerts", async () => {
  const h = harness(),
    q = h.load("lib/mail-queue.ts");
  const id = await q.enqueueMail({
    ...message,
    options: { ...message.options, expiresAt: Date.now() - 1 },
  });
  let sends = 0;
  await assert.rejects(
    q.processMailJob(id, async () => {
      sends++;
    }),
  );
  assert.equal(sends, 0);
  assert.equal(h.data.emailQueue[id].status, "expired");
  assert.equal(h.data.emailQueue[id].payload, null);
  const second = await q.enqueueMail(message);
  await assert.rejects(
    q.processMailJob(second, async () => {
      throw Object.assign(Error("Bad recipient"), { responseCode: 550 });
    }),
  );
  assert.equal(h.data.emailQueue[second].status, "failed");
  assert.ok(h.data.emailAlerts[second]);
});
test("chat search includes answers, rename and pinned answers sync, and other accounts cannot read or modify chats", async () => {
  const h = harness();
  let uid = "account-a";
  h.mocks["@/lib/server-auth"].verifyIdToken = async () => {
    if (!uid) throw Error("Sign in");
    return { uid };
  };
  const history = h.load("lib/aio/history.ts");
  await history.saveAuthenticatedAioTurn({
    uid,
    conversationId: "conversation-123",
    requestId: "request-123456",
    userContent: "Hello",
    assistantContent: "Your supplier catalogue is available.",
    sourceIds: ["doc-1"],
    sources: [{ id: "doc-1", title: "Company guide" }],
  });
  assert.equal(
    (await history.listAuthenticatedAioConversations(uid, "catalogue")).length,
    1,
  );
  const route = h.load("app/api/aio/conversations/route.ts");
  const patch = async (body) =>
    route.PATCH(
      new Request("http://test/api/aio/conversations", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  assert.equal(
    (await patch({ id: "conversation-123", title: "Supplier notes" })).status,
    200,
  );
  assert.equal(
    (
      await patch({
        id: "conversation-123",
        messageId: "request-123456",
        pinned: true,
      })
    ).status,
    200,
  );
  const c = await history.getAuthenticatedAioConversation(
    uid,
    "conversation-123",
  );
  assert.equal(c.title, "Supplier notes");
  assert.equal(c.messages[1].pinned, true);
  assert.equal(c.messages[1].sources[0].title, "Company guide");
  uid = "account-b";
  assert.equal(
    (
      await route.GET(
        new Request("http://test/api/aio/conversations?id=conversation-123"),
      )
    ).status,
    404,
  );
  assert.equal(
    (await patch({ id: "conversation-123", title: "Stolen" })).status,
    404,
  );
  uid = null;
  assert.equal(
    (await route.GET(new Request("http://test/api/aio/conversations"))).status,
    401,
  );
});
test("only approved knowledge is retrieved and private sources are not available anonymously", () => {
  const h = harness(),
    r = h.load("lib/aio/retrieval.ts");
  const records = r.adminKnowledgeRecords({
    draft: {
      title: "Secret draft",
      content: "Supplier terms",
      status: "pending",
    },
    old: { title: "Unreviewed legacy", content: "Supplier terms" },
    public: {
      title: "Supplier guide",
      content: "Supplier terms and catalogue",
      status: "approved",
      visibility: "public",
    },
    private: {
      title: "Supplier internal guide",
      content: "Supplier catalogue for partners",
      status: "approved",
      visibility: "authenticated",
    },
  });
  assert.equal(records.length, 2);
  assert.equal(
    r.retrieveAioKnowledge("supplier catalogue", records, {
      intent: "supplier",
      allowAuthenticated: false,
    }).length,
    1,
  );
  assert.equal(
    r.retrieveAioKnowledge("supplier catalogue", records, {
      intent: "supplier",
      allowAuthenticated: true,
    }).length,
    2,
  );
});
test("knowledge publication covers the full text, withdraw removes chunks, and source endpoints enforce audience", async () => {
  const h = harness();
  h.mocks["@/lib/server-auth"].verifyIdToken = async () => {
    throw Error("Sign in");
  };
  const text = "approved supplier catalogue ".repeat(500);
  h.data.aioKnowledgeDocuments = {
    document1: {
      title: "Supplier handbook",
      text,
      pdf: Buffer.from("%PDF-test").toString("base64"),
      visibility: "authenticated",
      status: "pending",
    },
  };
  const docs = h.load("lib/aio/knowledge-documents.ts");
  await docs.publishKnowledgeDocument(
    "document1",
    h.data.aioKnowledgeDocuments.document1,
    "admin-1",
  );
  assert.equal(
    Object.values(h.data.aioKnowledge)
      .map((c) => c.content)
      .join(""),
    text,
  );
  const source = h.load("app/api/aio/knowledge/[id]/route.ts");
  assert.equal(
    (
      await source.GET(new Request("http://test/source"), {
        params: { id: "document1" },
      })
    ).status,
    401,
  );
  h.data.aioKnowledgeDocuments.document1.visibility = "public";
  assert.equal(
    (
      await source.GET(new Request("http://test/source"), {
        params: { id: "document1" },
      })
    ).status,
    200,
  );
  await docs.withdrawKnowledgeDocument("document1");
  assert.equal(Object.keys(h.data.aioKnowledge).length, 0);
  assert.equal(
    (
      await source.GET(new Request("http://test/source"), {
        params: { id: "document1" },
      })
    ).status,
    404,
  );
});
test("status page data never publishes internal administrator fields or fabricated uptime", () => {
  const s = harness().load("lib/service-status.ts");
  const result = s.publicStatus({
    services: { email: { status: "outage", updatedAt: 1, secret: "hidden" } },
    incidents: {
      incident1: {
        title: "Email issue",
        body: "Investigating delivery delays.",
        createdBy: "private-admin",
        privateNote: "hidden",
        status: "investigating",
        serviceIds: ["email", "secret"],
        createdAt: 1,
        updatedAt: 2,
      },
    },
  });
  assert.equal(result.services.find((s) => s.id === "email").status, "outage");
  assert.equal(
    result.services.find((s) => s.id === "website").status,
    "unknown",
  );
  assert.ok(!/private-admin|hidden|secret/.test(JSON.stringify(result)));
  assert.equal(result.uptime, undefined);
});
test("offline replies respect settings, claim one reply per customer turn, and fall back safely when AI fails", async () => {
  const h = harness({
    settings: {
      adminAvailability: { online: false },
      ai: { enabled: true, autoReplyWhenOffline: true },
    },
    tickets: {
      ticket1: {
        email: "customer@example.test",
        subject: "Help",
        message: "Where is my application?",
        status: "open",
        createdAt: 10,
      },
    },
  });
  h.mocks["@/lib/server-groq"] = {
    generateGroqResponse: async () => {
      throw Error("Provider offline");
    },
  };
  h.mocks["@/lib/server-mail"].sendTicketResponseEmail = async (value) => {
    h.mails.push(value);
    return { queued: true };
  };
  const support = h.load("lib/support/offline.ts");
  const results = await Promise.all([
    support.autoReplyToTicket("ticket1"),
    support.autoReplyToTicket("ticket1"),
  ]);
  assert.equal(results.filter((r) => r.automated).length, 1);
  assert.equal(h.mails.length, 1);
  assert.equal(Object.keys(h.data.tickets.ticket1.messages).length, 1);
  assert.equal(h.data.tickets.ticket1.status, "in-progress");
  assert.match(
    h.data.tickets.ticket1.lastResponse,
    /automated acknowledgement/,
  );
  assert.equal((await support.autoReplyToTicket("ticket1")).automated, false);
  h.data.settings.adminAvailability.online = true;
  h.data.tickets.ticket1.messages.next = {
    role: "customer",
    content: "More details",
    createdAt: Date.now(),
  };
  assert.equal((await support.autoReplyToTicket("ticket1")).automated, false);
  assert.equal(support.adminIsOffline({ online: true, onlineUntil: 1 }), true);
});
test("offline reply cannot overwrite a human answer that arrives during model generation", async () => {
  const h = harness({
    settings: { adminAvailability: { online: false } },
    tickets: {
      ticket1: {
        email: "customer@example.test",
        message: "Help me please",
        status: "open",
        createdAt: 10,
      },
    },
  });
  h.mocks["@/lib/server-groq"] = {
    generateGroqResponse: async () => {
      h.data.tickets.ticket1.messages = {
        human: { role: "admin", content: "I can help", createdAt: Date.now() },
      };
      return "Automated answer";
    },
  };
  const result = await h
    .load("lib/support/offline.ts")
    .autoReplyToTicket("ticket1");
  assert.equal(result.automated, false);
  assert.equal(Object.keys(h.data.tickets.ticket1.messages).length, 1);
});
test("offline reply admin endpoint requires authentication and cron rejects missing secrets", async () => {
  const h = harness();
  h.setAdmin(false);
  assert.equal(
    (
      await h.call("app/api/support/auto-response/route.ts", {
        ticketId: "ticket1",
      })
    ).status,
    401,
  );
  const route = h.load("app/api/cron/offline-support/route.ts");
  assert.equal(
    (await route.GET(new Request("http://test/api/cron/offline-support")))
      .status,
    401,
  );
});
test("guest ticket replies require the secret returned at creation, not an email address", async () => {
  const token = "a".repeat(64),
    h = harness({
      tickets: {
        ticket1: {
          email: "customer@example.test",
          replyTokenHash: crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"),
          message: "Help",
          createdAt: 1,
          status: "open",
        },
      },
    });
  h.mocks["@/lib/server-auth"].verifyIdToken = async () => {
    throw Error("Sign in");
  };
  const file = "app/api/support/reply/route.ts";
  assert.equal(
    (
      await h.call(file, {
        ticketId: "ticket1",
        email: "customer@example.test",
        message: "Guessing email is not enough",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await h.call(file, {
        ticketId: "ticket1",
        replyToken: token,
        message: "A valid follow-up",
      })
    ).status,
    200,
  );
});
test("screening is restricted to admins and supplier model outages retain manual review", async () => {
  const h = harness({
    suppliers: {
      supplier1: {
        contactName: "Taylor",
        email: "supplier@example.test",
        companyName: "Example Wholesale",
        catalogUrl: "https://example.test/catalogue",
      },
    },
  });
  h.mocks["@/lib/server-groq"] = {
    generateGroqResponse: async () => {
      throw Error("Model offline");
    },
  };
  const file = "app/api/admin/applications/screen/route.ts";
  h.setAdmin(false);
  assert.equal(
    (
      await h.call(file, {
        applicationType: "supplier",
        applicationId: "supplier1",
      })
    ).status,
    401,
  );
  h.setAdmin(true);
  const result = await h.call(file, {
    applicationType: "supplier",
    applicationId: "supplier1",
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.screening.modelAvailable, false);
  assert.equal(result.body.screening.manualReviewRecommended, true);
  assert.equal(h.data.suppliers.supplier1.status, undefined);
});

test("seller screening survives provider failures and never changes a final admin decision", async () => {
  const application = {
    fullName: "Taylor Example",
    businessName: "Example Wholesale",
    businessEmail: "business@example.test",
    personalEmail: "personal@example.test",
    preferredContactType: "business",
    preferredContactEmail: "business@example.test",
    phone: "+15551234567",
    country: "United States",
    address: "123 Example Street",
    city: "Miami",
    state: "Florida",
    zipCode: "33101",
    businessType: "Wholesaler",
    productCategories: "Home and kitchen supplies",
    businessInformation:
      "We distribute genuine branded home products through established wholesale relationships.",
    whyWorkWithAuronix:
      "We would like to expand our distribution by building a lasting wholesale partnership.",
    contactAgreement: true,
    status: "pending",
  };
  const h = harness({ sellerApplications: { application1: application } });
  h.mocks["@/lib/server-groq"] = {
    generateGroqResponse: async () => {
      throw Error("Provider unavailable");
    },
  };
  h.mocks["@/lib/seller-tracking"] = {
    notifySellerApplication: async () => {},
  };
  h.mocks["@/lib/server-seller-invitations"].issueSellerInvitation =
    async () => {
      throw Error("Must not invite");
    };
  const file = "app/api/admin/sellers/ai-screen/route.ts";
  const result = await h.call(file, {
    applicationId: "application1",
    automatic: true,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.screening.modelAvailable, false);
  assert.equal(result.body.screening.autoEligible, false);
  assert.equal(h.data.sellerApplications.application1.status, "under_review");
  h.data.sellerApplications.application1.status = "rejected";
  assert.equal(
    (await h.call(file, { applicationId: "application1" })).status,
    500,
  );
  assert.equal(h.data.sellerApplications.application1.status, "rejected");
});
test("real PDF extraction reads company text and rejects image-only or non-PDF uploads", async () => {
  const { PDFDocument, StandardFonts } = require("pdf-lib");
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage()
    .drawText(
      "Auronix approved supplier handbook. Contact the support team for questions.",
      { font, size: 12 },
    );
  const docs = harness().load("lib/aio/knowledge-documents.ts");
  const extracted = await docs.extractPdfKnowledge(await pdf.save());
  assert.match(extracted.text, /Auronix approved supplier handbook/);
  assert.equal(extracted.pageCount, 1);
  await assert.rejects(docs.extractPdfKnowledge(Buffer.from("not a pdf")));
  const blank = await PDFDocument.create();
  blank.addPage();
  await assert.rejects(
    docs.extractPdfKnowledge(await blank.save()),
    /No readable text/,
  );
});
test("branded password reset keeps its encrypted retry job without a provider email", async () => {
  const h = harness({
    emailQueue: {
      "reset-job": {
        status: "queued",
        payload: { encrypted: true },
        leaseUntil: 0,
      },
    },
  });
  h.setAuthUser({ uid: "customer", email: "customer@example.test" });
  h.failPasswordResetFallback(true);
  h.mocks["@/lib/server-mail"].sendPasswordResetEmail = async () => ({
    queued: true,
    queueId: "reset-job",
    messageId: "queue:reset-job",
  });
  assert.equal(
    (
      await h.call("app/api/auth/request-password-reset/route.ts", {
        email: "customer@example.test",
      })
    ).status,
    200,
  );
  assert.equal(h.data.emailQueue["reset-job"].status, "queued");
  assert.deepEqual(h.data.emailQueue["reset-job"].payload, { encrypted: true });
  assert.equal(h.data.emailQueue["reset-job"].leaseUntil, 0);
  assert.ok(!h.mails.some(m=>m.type==='password-reset-fallback'));
});
