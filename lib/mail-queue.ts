import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "crypto";
import { adminDb } from "@/lib/firebase-admin";

export type QueuedMail = { sender: string; options: Record<string, any> };
const MAX_ATTEMPTS = 6;
const LEASE_MS = 120_000;
function key() {
  const secret =
    process.env.EMAIL_QUEUE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!secret) throw new Error("Email queue encryption is not configured.");
  return createHash("sha256").update(secret).digest();
}
function encrypt(value: QueuedMail) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  return {
    iv: iv.toString("base64"),
    data: Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]).toString("base64"),
    ...{ tag: cipher.getAuthTag().toString("base64") },
  };
}
function decrypt(value: any): QueuedMail {
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(value.iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const mail = JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(value.data, "base64")),
      cipher.final(),
    ]).toString(),
  );
  mail.options.attachments = mail.options.attachments?.map((a: any) => ({
    ...a,
    content: Buffer.from(a.content.data || a.content),
  }));
  return mail;
}
export function retryDelay(attempt: number) {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 30 * 60_000);
}
export function retryableMailError(error: any) {
  return (
    !error?.partialAcceptance &&
    ![550, 551, 553, 554].includes(Number(error?.responseCode))
  );
}
async function alert(id: string, job: any, status: string) {
  await adminDb
    .ref(`emailAlerts/${id}`)
    .set({
      jobId: id,
      recipient: job.recipient,
      subject: job.subject,
      status,
      message:
        status === "queued"
          ? "Delivery failed; automatic retries are scheduled. Check SMTP configuration if this persists."
          : "Email could not be sent. Review delivery settings and contact the customer if needed.",
      createdAt: Date.now(),
      resolved: false,
    });
}
export async function enqueueMail(mail: QueuedMail) {
  const stableId = mail.options.idempotencyKey
    ? createHash("sha256")
        .update(String(mail.options.idempotencyKey))
        .digest("hex")
    : "";
  const ref = stableId
    ? adminDb.ref(`emailQueue/${stableId}`)
    : adminDb.ref("emailQueue").push();
  const now = Date.now(),
    security = /reset|verif|security code|one.time|sign.in/i.test(
      mail.options.subject,
    );
  const expiresAt = Math.min(
    Number(mail.options.expiresAt) ||
      now + (security ? 5 * 60_000 : 24 * 60 * 60_000),
    now + 48 * 60 * 60_000,
  );
  const record = {
    recipient: Array.isArray(mail.options.to)
      ? mail.options.to.join(", ")
      : mail.options.to,
    subject: mail.options.subject,
    status: "queued",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    security,
    payload: encrypt(mail),
    providerMessageId: "",
    leaseUntil: 0,
  };
  await ref.transaction((current) => current || record);
  return ref.key!;
}
export async function processMailJob(
  id: string,
  send: (mail: QueuedMail, id: string) => Promise<any>,
) {
  if (!/^[\w-]+$/.test(id)) throw new Error("Invalid email job.");
  const ref = adminDb.ref(`emailQueue/${id}`),
    owner = randomUUID(),
    now = Date.now();
  const claim = await ref.transaction((job) => {
    if (!job) return job;
    if (
      !["queued", "processing"].includes(job.status) ||
      job.nextAttemptAt > now ||
      job.leaseUntil > now
    )
      return;
    if (job.expiresAt <= now || job.attempts >= MAX_ATTEMPTS)
      return {
        ...job,
        status: "expired",
        payload: null,
        leaseUntil: 0,
        updatedAt: now,
      };
    return {
      ...job,
      status: "processing",
      owner,
      leaseUntil: now + LEASE_MS,
      attempts: (job.attempts || 0) + 1,
      updatedAt: now,
    };
  });
  const job = claim.snapshot.val();
  if (
    !claim.committed ||
    !job ||
    job.owner !== owner ||
    job.status !== "processing"
  ) {
    if (job?.status === "expired") await alert(id, job, "expired");
    if (job && ["failed", "expired"].includes(job.status))
      throw new Error(
        "This email cannot be sent. Request a fresh email after checking delivery settings.",
      );
    return {
      skipped: true,
      success: job?.status === "sent",
      queued: job?.status === "queued" || job?.status === "processing",
      queueId: id,
      messageId: job?.providerMessageId || "",
    };
  }
  try {
    const result = await send(decrypt(job.payload), id);
    await ref.transaction((current) => {
      // Firebase may invoke the callback with an empty local cache first.
      // Returning null lets the server retry with its current record; undefined aborts.
      if (current === null) return current;
      return current?.owner === owner
        ? {
            ...current,
            status: "sent",
            providerMessageId: String(result.messageId || ""),
            payload: null,
            sentAt: Date.now(),
            leaseUntil: 0,
            updatedAt: Date.now(),
          }
        : undefined;
    });
    await adminDb.ref(`emailAlerts/${id}`).remove();
    return { ...result, success: true, queued: false, queueId: id };
  } catch (error: any) {
    const terminal =
      !retryableMailError(error) ||
      job.attempts >= MAX_ATTEMPTS ||
      job.expiresAt <= Date.now();
    const status = terminal ? "failed" : "queued";
    const code = String(error?.code || error?.responseCode || "DELIVERY_FAILED")
      .replace(/[^a-z0-9_-]/gi, "")
      .slice(0, 60);
    await ref.transaction((current) => {
      if (current === null) return current;
      return current?.owner === owner
        ? {
            ...current,
            status,
            payload: terminal ? null : current.payload,
            lastError: code,
            nextAttemptAt: Date.now() + retryDelay(job.attempts),
            leaseUntil: 0,
            updatedAt: Date.now(),
          }
        : undefined;
    });
    await alert(id, job, status);
    if (terminal)
      throw new Error(
        `Email delivery failed (${code}). Check Admin → Email delivery.`,
      );
    return {
      success: true,
      queued: true,
      queueId: id,
      messageId: `queue:${id}`,
      accepted: [],
    };
  }
}
export async function drainMailQueue(
  send: (mail: QueuedMail, id: string) => Promise<any>,
  limit = 3,
) {
  const now = Date.now(),
    snapshot = await adminDb.ref("emailQueue").get();
  const jobs = Object.entries(snapshot.val() || {})
    .filter(
      ([, j]: any) =>
        ["queued", "processing"].includes(j.status) &&
        j.nextAttemptAt <= now &&
        j.leaseUntil <= now,
    )
    .sort(
      ([, a]: any, [, b]: any) =>
        Number(b.security) - Number(a.security) || a.createdAt - b.createdAt,
    )
    .slice(0, limit);
  const results = await Promise.allSettled(
    jobs.map(([id]) => processMailJob(id, send)),
  );
  await adminDb
    .ref("workerHealth/emailQueue")
    .set({
      checkedAt: Date.now(),
      processed: jobs.length,
      failures: results.filter((r) => r.status === "rejected").length,
    });
  return {
    processed: jobs.length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}
export function publicMailJob(id: string, job: any) {
  return {
    id,
    recipient: job.recipient,
    subject: job.subject,
    status: ["queued", "processing"].includes(job.status) && Number(job.expiresAt) <= Date.now()
      ? "expired"
      : job.status,
    attempts: job.attempts,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    nextAttemptAt: job.nextAttemptAt,
    expiresAt: job.expiresAt,
    providerMessageId: job.providerMessageId || "",
    lastError: job.lastError || "",
  };
}
