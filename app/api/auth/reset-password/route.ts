import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { protectPublicRequest, publicRequestErrorResponse } from "@/lib/server-protection";
import { activityEmail } from "@/lib/email/activity";
export const runtime = "nodejs";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, "password-reset-complete", body, { limit: 8, windowMs: 15 * 60_000 });
    const code = typeof body.code === "string" ? body.code : "", password = typeof body.password === "string" ? body.password : "";
    if (!code || code.length > 2048 || password.length < 8 || password.length > 128)
      return reply({ error: "Use a valid reset link and a password of 8–128 characters." }, 400);
    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
    if (!key) return reply({ error: "Password recovery is temporarily unavailable. Please contact support." }, 503);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://auronixcommerce.com").replace(/\/+$/, "");
    // The provider validates and consumes the existing credential atomically. Never accept a caller-supplied recipient.
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json", Referer: `${site}/reset-password` },
      body: JSON.stringify({ oobCode: code, newPassword: password }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    const value = await response.json().catch(() => null);
    if (!response.ok) {
      const kind = String(value?.error?.message || "");
      if (/WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET_REQUIREMENTS/.test(kind)) return reply({ error: "Choose a stronger password that meets your account security policy." }, 400);
      if (/EXPIRED_OOB_CODE|INVALID_OOB_CODE|USER_DISABLED|USER_NOT_FOUND/.test(kind)) return reply({ error: "This reset link is invalid, expired, or has already been used." }, 400);
      return reply({ error: "Password recovery is temporarily unavailable. Please try again." }, 503);
    }
    if (typeof value?.email === "string") await activityEmail({ to: value.email, event: "password-changed", title: "Your Auronix password was changed", body: "Your account password was successfully reset. If you did not make this change, request a new reset immediately and contact support. Never share your password or verification codes.", reference: createHash("sha256").update(code).digest("hex"), href: "/forgot-password" });
    return reply({ success: true, message: "Your password has been updated. Sign in with your new password." });
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    return blocked ? reply(blocked.body, blocked.status) : reply({ error: "Unable to complete the reset. Try signing in before requesting another link." }, 503);
  }
}
