import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendPasswordResetEmail } from "@/lib/server-mail";
import { protectPublicRequest, publicRequestErrorResponse } from "@/lib/server-protection";
import { reportOperationalError } from "@/lib/server-audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, "password-reset", body, { limit: 5, windowMs: 30 * 60_000 });
    const email = String(body.email || "").trim().toLowerCase();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const ref = adminDb.ref("emailDeliveryLogs").push(), now = Date.now(), requestId = ref.key || `reset-${now}`;
    const update = (value: Record<string, unknown>) => ref.update({ ...value, updatedAt: Date.now() }).catch(() => undefined);
    await ref.set({ id: requestId, recipient: email, subject: "Reset your Auronix Commerce password", event: "password-reset", status: "queued", createdAt: now, updatedAt: now });
    const accepted = () => NextResponse.json({ success: true, requestId, message: "If an account exists for this email, reset instructions have been requested." }, { headers: { "Cache-Control": "no-store" } });
    let user;
    try { user = await adminAuth.getUserByEmail(email); }
    catch (e: any) { if (e?.code === "auth/user-not-found") { await update({ status: "accepted" }); return accepted(); } throw e; }
    if (!user.email || user.disabled) { await update({ status: "accepted" }); return accepted(); }
    try {
      // The auth service issues the one-time credential; Auronix owns every emailed URL and page.
      // No continue URL is needed: this avoids a dependency on provider-hosted action-page settings.
      const generated = new URL(await adminAuth.generatePasswordResetLink(user.email));
      const code = generated.searchParams.get("oobCode");
      if (!code) throw Error("Reset credential unavailable");
      const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://auronixcommerce.com").replace(/\/+$/, "");
      const result: any = await sendPasswordResetEmail({ email: user.email, name: user.displayName || "", resetUrl: `${site}/reset-password?code=${encodeURIComponent(code)}` });
      await update({ status: result?.queued ? "queued" : "sent", queueId: result?.queueId || "", providerMessageId: String(result?.messageId || "").slice(0,500), deliveryChannel: "auronix-smtp" });
    } catch {
      await update({ status: "failed", error: "Auronix reset delivery needs attention. No provider-hosted email was sent." });
      await reportOperationalError("password-reset-delivery", new Error("Auronix password reset generation or delivery failed"), { requestId }).catch(() => undefined);
    }
    // Identical response for missing accounts and delivery failure prevents account enumeration.
    return accepted();
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked) return NextResponse.json(blocked.body, { status: blocked.status });
    return NextResponse.json({ error: "Unable to process the password reset request." }, { status: 500 });
  }
}
