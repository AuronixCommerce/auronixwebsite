import { waitUntil } from "@vercel/functions";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendProfessionalEmail } from "@/lib/server-mail";
import { postWebhook, resolveWebhook } from "./webhook-network";
export const WEBHOOK_TYPES = ["payment.approved", "balance.low"] as const;
function encryptionKey() {
  const root =
    process.env.EMAIL_QUEUE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!root) throw Error("Webhook secret storage is not configured.");
  return createHash("sha256")
    .update("aio.webhooks.v1:" + root)
    .digest();
}
function seal(secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  return {
    iv: iv.toString("base64"),
    data: Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]).toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}
function unseal(v: any) {
  const cipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(v.iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(v.tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(v.data, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
export function signature(secret: string, timestamp: string, raw: string) {
  return (
    "v1=" +
    createHmac("sha256", secret)
      .update(timestamp + "." + raw)
      .digest("hex")
  );
}
export function webhookDto(v: any) {
  return v
    ? {
        url: v.url,
        enabled: v.enabled,
        events: v.events,
        version: v.version,
        secretPrefix: v.secretPrefix,
        updatedAt: v.updatedAt,
      }
    : {
        url: "",
        enabled: false,
        events: [...WEBHOOK_TYPES],
        version: 0,
        secretPrefix: "",
      };
}
export async function configureWebhook(uid: string, b: any) {
  if (
    typeof b.enabled !== "boolean" ||
    !Array.isArray(b.events) ||
    !b.events.length ||
    b.events.some((t: any) => !WEBHOOK_TYPES.includes(t))
  )
    throw Error("Select payment approval and/or low-balance events.");
  await resolveWebhook(b.url);
  const ref = adminDb.ref(`aioDeveloperWebhooks/${uid}`),
    prior = (await ref.get()).val();
  const secret =
    !prior || b.rotate === true
      ? "whsec_" + randomBytes(32).toString("hex")
      : "";
  const value = {
    url: b.url,
    enabled: b.enabled,
    events: Array.from(new Set<string>(b.events)),
    version: Number(prior?.version || 0) + 1,
    secretCipher: secret ? seal(secret) : prior.secretCipher,
    secretPrefix: secret ? secret.slice(0, 14) + "…" : prior.secretPrefix,
    updatedAt: Date.now(),
  };
  // CAS prevents concurrent secret rotations from returning a secret that was already replaced.
  const r = await ref.transaction((v) =>
    Number(v?.version || 0) === Number(prior?.version || 0) ? value : undefined,
  );
  if (!r.committed) throw Error("Webhook settings changed. Refresh and retry.");
  if (
    value.enabled &&
    (!prior?.enabled || !prior?.events?.includes("balance.low"))
  )
    await adminDb
      .ref(`aioDeveloperBilling/${uid}`)
      .transaction((v) => (v ? { ...v, lowBalanceArmed: true } : v));
  return {
    webhook: webhookDto(value),
    ...(secret ? { secret } : {}),
    message: secret
      ? "Webhook saved. Copy the signing secret now; it is shown once."
      : "Webhook settings saved.",
  };
}
export async function queueEvent(uid: string, event: any) {
  const config = (await adminDb.ref(`aioDeveloperWebhooks/${uid}`).get()).val(),
    now = Date.now();
  const interested =
    config?.enabled &&
    (event.type === "endpoint.test" || config.events?.includes(event.type));
  const payload = {
    id: event.id,
    type: event.type,
    api_version: "2026-11-14",
    created_at: new Date(event.createdAt || now).toISOString(),
    data: event.data,
  };
  const value = {
    id: event.id,
    uid,
    type: event.type,
    payload,
    createdAt: event.createdAt || now,
    nextAttemptAt: now,
    status: "queued",
    leaseUntil: 0,
    email: { state: event.email ? "queued" : "disabled", attempts: 0 },
    webhook: {
      state: interested ? "queued" : "disabled",
      attempts: 0,
      version: interested ? config.version : 0,
      url: interested ? config.url : "",
    },
  };
  const r = await adminDb
    .ref(`aioDeveloperEventQueue/${event.id}`)
    .transaction((v) => (v ? undefined : value));
  if (r.committed) await mirrorEvent(value);
  return event.id;
}
async function mirrorEvent(v: any) {
  const { leaseId, leaseUntil, ...safe } = v;
  await adminDb.ref(`aioDeveloperEvents/${v.uid}/${v.id}`).set(safe);
}
const delay = [60_000, 300_000, 1_800_000, 21_600_000, 86_400_000, 86_400_000];
export async function deliverEvent(id: string) {
  const ref = adminDb.ref(`aioDeveloperEventQueue/${id}`),
    now = Date.now(),
    leaseId = randomBytes(12).toString("hex");
  const claim = await ref.transaction((v) =>
    v &&
    v.status === "queued" &&
    v.nextAttemptAt <= now &&
    Number(v.leaseUntil || 0) <= now
      ? { ...v, leaseUntil: now + 90_000, leaseId }
      : undefined,
  );
  if (!claim.committed) return false;
  const job = claim.snapshot.val();
  if (job.email.state === "queued") {
    job.email.attempts++;
    try {
      const user = await adminAuth.getUser(job.uid);
      if (!user.emailVerified || user.disabled || !user.email)
        throw Error("Account email unavailable.");
      await sendProfessionalEmail(
        {
          to: user.email,
          subject: "AIO API low-balance alert",
          text: `Your AIO developer balance is at or below your alert threshold.\nBalance: ${Number(job.payload.data.balance_units) / 1_000_000} credits\nThreshold: ${Number(job.payload.data.threshold_units) / 1_000_000} credits\n\nReview usage and request a manual top-up: https://auronixcommerce.com/aio/developers/console?tab=billing`,
          idempotencyKey: "aio-event:" + job.id,
        },
        "notification",
      );
      job.email.state = "accepted";
      job.email.lastError = "";
    } catch {
      job.email.lastError = "Notification could not be accepted for delivery.";
      if (job.email.attempts >= 6) job.email.state = "failed";
    }
  }
  if (job.webhook.state === "queued") {
    const cfg = (
      await adminDb.ref(`aioDeveloperWebhooks/${job.uid}`).get()
    ).val();
    if (
      !cfg?.enabled ||
      cfg.version !== job.webhook.version ||
      cfg.url !== job.webhook.url
    )
      job.webhook.state = "cancelled";
    else {
      job.webhook.attempts++;
      try {
        const raw = JSON.stringify(job.payload),
          timestamp = String(Math.floor(Date.now() / 1000));
        const status = await postWebhook(cfg.url, raw, {
          "AIO-Webhook-Id": job.id,
          "AIO-Webhook-Timestamp": timestamp,
          "AIO-Webhook-Signature": signature(
            unseal(cfg.secretCipher),
            timestamp,
            raw,
          ),
          "User-Agent": "Auronix-Webhooks/1.0",
        });
        job.webhook.state = "delivered";
        job.webhook.statusCode = status;
        job.webhook.lastError = "";
      } catch (e: any) {
        job.webhook.lastError =
          "Delivery failed; check the endpoint, TLS, and response status.";
        job.webhook.statusCode = Number(e?.status || 0);
        if (job.webhook.attempts >= 6) job.webhook.state = "failed";
      }
    }
  }
  const pending =
      job.email.state === "queued" || job.webhook.state === "queued",
    attempts = Math.max(job.email.attempts, job.webhook.attempts);
  job.status = pending
    ? "queued"
    : job.email.state === "failed" || job.webhook.state === "failed"
      ? "failed"
      : "completed";
  job.nextAttemptAt = pending
    ? Date.now() + delay[Math.min(attempts - 1, delay.length - 1)]
    : Number.MAX_SAFE_INTEGER;
  job.updatedAt = Date.now();
  job.leaseUntil = 0;
  const saved = await ref.transaction((v) =>
    v?.leaseId === leaseId ? job : undefined,
  );
  if (saved.committed) await mirrorEvent(job);
  return saved.committed;
}
export async function flushAccountEvents(uid: string, attempt = true) {
  const pending =
    (
      await adminDb.ref(`aioDeveloperBilling/${uid}/pendingEvents`).get()
    ).val() || {};
  let delivered = false;
  for (const [id, event] of Object.entries<any>(pending).slice(0, 8)) {
    await queueEvent(uid, event);
    await adminDb
      .ref(`aioDeveloperBilling/${uid}/pendingEvents/${id}`)
      .remove();
    if (attempt && !delivered) {
      await deliverEvent(id);
      delivered = true;
    }
  }
  await adminDb.ref(`aioDeveloperBilling/${uid}`).transaction((v) =>
    v
      ? {
          ...v,
          hasPendingEvents: Object.keys(v.pendingEvents || {}).length > 0,
        }
      : v,
  );
  if (attempt && !delivered) {
    const recent =
      (
        await adminDb
          .ref(`aioDeveloperEvents/${uid}`)
          .orderByChild("createdAt")
          .limitToLast(20)
          .get()
      ).val() || {};
    for (const job of Object.values<any>(recent).sort(
      (a, b) => b.createdAt - a.createdAt,
    )) {
      if (job.status === "queued" && job.nextAttemptAt <= Date.now()) {
        await deliverEvent(job.id);
        break;
      }
    }
  }
}
export async function retryEvent(uid: string, id: string) {
  const ref = adminDb.ref(`aioDeveloperEventQueue/${id}`),
    cfg = (await adminDb.ref(`aioDeveloperWebhooks/${uid}`).get()).val();
  const r = await ref.transaction((v) => {
    if (!v || v.uid !== uid || v.leaseUntil > Date.now()) return;
    const mail =
      v.email.state === "failed" ? { state: "queued", attempts: 0 } : v.email;
    return {
      ...v,
      email: mail,
      webhook: cfg?.enabled
        ? { state: "queued", attempts: 0, version: cfg.version, url: cfg.url }
        : v.webhook,
      status: "queued",
      nextAttemptAt: Date.now(),
      leaseUntil: 0,
      leaseId: "",
    };
  });
  if (!r.committed) throw Error("Delivery not found or already processing.");
  await deliverEvent(id);
  return { message: "Delivery retried. Check its latest status." };
}
export async function drainDeveloperEvents(limit = 20) {
  const pending =
    (
      await adminDb
        .ref("aioDeveloperBilling")
        .orderByChild("hasPendingEvents")
        .equalTo(true)
        .limitToFirst(10)
        .get()
    ).val() || {};
  for (const uid of Object.keys(pending))
    await flushAccountEvents(uid, false).catch(() => undefined);
  const now = Date.now(),
    jobs =
      (
        await adminDb
          .ref("aioDeveloperEventQueue")
          .orderByChild("nextAttemptAt")
          .endAt(now)
          .limitToFirst(limit)
          .get()
      ).val() || {};
  let count = 0;
  for (const id of Object.keys(jobs)) {
    if (Date.now() - now > 35_000) break;
    try {
      if (await deliverEvent(id)) count++;
    } catch {
      /* Durable job remains queued for the next run. */
    }
  }
  return count;
}

export async function scheduleAccountEvents(uid: string) {
  const task = flushAccountEvents(uid).catch(() => {
    console.error("[AIO events] Delivery remains pending for retry.");
  });
  if (process.env.VERCEL === "1") waitUntil(task);
  else await task;
}
