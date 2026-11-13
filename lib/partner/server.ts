import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { otpHash, equalHash } from "@/lib/aio/customer-security";
import { sendProfessionalEmail } from "@/lib/server-mail";
import {
  protectPublicRequest,
  publicRequestErrorResponse,
} from "@/lib/server-protection";
import { emailAddress, isEmail, text, validId } from "./model";
export const COOKIE = "auronix_partner";
export const fingerprint = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new PortalError("Refresh the page and try again.", 403);
}
export async function guard(
  request: Request,
  scope: string,
  body: any,
  limit = 20,
) {
  sameOrigin(request);
  if (
    [
      "partner-workspace",
      "partner-document",
      "partner-booking",
      "site-insights",
    ].includes(scope)
  ) {
    if (scope !== "site-insights") await partner();
    const bucket = Math.floor(Date.now() / 900000),
      ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const result = await adminDb
      .ref(`partnerRateLimits/${scope}/${bucket}/${fingerprint(ip)}`)
      .transaction((v) => Number(v || 0) + 1);
    if (result.snapshot.val() > limit)
      throw new PortalError(
        "Too many requests. Please wait and try again.",
        429,
      );
  } else
    await protectPublicRequest(request, scope, body, {
      limit,
      windowMs: 15 * 60_000,
    });
}
export function response(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  const blocked = publicRequestErrorResponse(error);
  if (blocked) return response(blocked.body, blocked.status);
  if (error instanceof PortalError)
    return response({ error: error.message }, error.status);
  console.error(
    "[Partner workspace]",
    error instanceof Error ? error.message : "Failed",
  );
  return response(
    { error: "This service is temporarily unavailable. Please retry." },
    503,
  );
}
export async function partner() {
  const token = cookies().get(COOKIE)?.value || "";
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new PortalError("Verify your email to continue.", 401);
  const session = (
    await adminDb.ref(`partnerSessions/${fingerprint(token)}`).get()
  ).val();
  if (!session || session.expiresAt < Date.now())
    throw new PortalError(
      "Your session expired. Verify your email again.",
      401,
    );
  return {
    email: session.email as string,
    key: fingerprint(session.email),
    sessionKey: fingerprint(token),
  };
}
export async function ownSupplier(id: unknown, email: string) {
  if (!validId(id)) throw new PortalError("Submission not found.", 404);
  const data = (await adminDb.ref(`suppliers/${id}`).get()).val();
  if (!data || emailAddress(data.email) !== email)
    throw new PortalError("Submission not found.", 404);
  return { ...data, id };
}
export async function notify(
  email: string,
  title: string,
  message: string,
  kind: string,
  reference = "",
  sendEmail = true,
) {
  email = emailAddress(email);
  if (!isEmail(email)) throw new PortalError("A valid recipient is required.");
  const ref = adminDb.ref(`partnerNotifications/${fingerprint(email)}`).push();
  await ref.set({
    id: ref.key,
    title,
    message,
    type: kind,
    reference,
    createdAt: Date.now(),
    readAt: 0,
  });
  if (!sendEmail) return "recorded";
  const result: any = await sendProfessionalEmail(
    {
      to: email,
      subject: title,
      body: `${message}\n\nOpen your secure workspace: ${(process.env.NEXT_PUBLIC_SITE_URL || "https://auronixcommerce.com").replace(/\/$/, "")}/supplier/track`,
      idempotencyKey: `partner-${ref.key}`,
    },
    "notification",
  ).catch(() => ({ failed: true }));
  return result?.failed ? "failed" : result?.queued ? "queued" : "sent";
}
export async function timeline(
  id: string,
  input: {
    type: string;
    title: string;
    message?: string;
    actor?: string;
    visibility?: string;
  },
) {
  const ref = adminDb.ref(`suppliers/${id}/timeline`).push();
  await ref.set({ id: ref.key, ...input, createdAt: Date.now() });
}
export async function access(request: Request) {
  const body = await request.json();
  await guard(
    request,
    body.action === "logout" ? "partner-workspace" : "partner-access",
    body,
    15,
  );
  if (body.action === "logout") {
    const current = await partner();
    await adminDb.ref(`partnerSessions/${current.sessionKey}`).remove();
    const result = response({ success: true });
    result.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
    return result;
  }
  if (body.action === "start") {
    const email = emailAddress(body.email);
    if (!isEmail(email)) throw new PortalError("Enter a valid email address.");
    const hour = Math.floor(Date.now() / 3600000),
      key = fingerprint(email);
    const throttle = await adminDb
      .ref(`partnerEmailLimits/${key}/${hour}`)
      .transaction((v) => Number(v || 0) + 1);
    if (throttle.snapshot.val() > 5)
      throw new PortalError("Please wait before requesting another code.", 429);
    const id = randomBytes(24).toString("hex"),
      code = String(require("crypto").randomInt(100000, 1000000));
    await adminDb.ref(`partnerChallenges/${id}`).set({
      email,
      hash: otpHash(id, email, code),
      attempts: 0,
      expiresAt: Date.now() + 10 * 60_000,
      used: false,
    });
    const sent: any = await sendProfessionalEmail(
      {
        to: email,
        subject: "Your Auronix workspace verification code",
        body: `Your verification code is ${code}. It expires in 10 minutes. Enter it only in the Auronix verification box.`,
        idempotencyKey: `partner-otp-${id}`,
        expiresAt: Date.now() + 10 * 60_000,
      },
      "notification",
    );
    return response({
      id,
      status: sent?.queued ? "queued" : "sent",
      message: sent?.queued
        ? "Your email is queued for delivery. Wait for the code before continuing."
        : "Check your inbox for the six-digit code.",
    });
  }
  if (
    body.action !== "verify" ||
    !validId(body.id) ||
    !/^\d{6}$/.test(String(body.code))
  )
    throw new PortalError("Enter the six-digit code.");
  const ref = adminDb.ref(`partnerChallenges/${body.id}`);
  const attempt = await ref.transaction((v) =>
    !v || v.used || v.expiresAt < Date.now() || v.attempts >= 5
      ? undefined
      : { ...v, attempts: v.attempts + 1 },
  );
  const item = attempt.snapshot.val();
  if (
    !attempt.committed ||
    !item ||
    !equalHash(item.hash, otpHash(body.id, item.email, body.code))
  )
    throw new PortalError(
      "The code is invalid or expired. Request a new code.",
    );
  const consumed = await ref.transaction((v) =>
    !v || v.used || v.expiresAt < Date.now() ? undefined : { ...v, used: true },
  );
  if (!consumed.committed)
    throw new PortalError("This code has already been used.");
  const token = randomBytes(32).toString("hex"),
    expiresAt = Date.now() + 7 * 86400000;
  await adminDb
    .ref(`partnerSessions/${fingerprint(token)}`)
    .set({ email: item.email, createdAt: Date.now(), expiresAt });
  const result = response({ success: true, email: item.email });
  result.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return result;
}
