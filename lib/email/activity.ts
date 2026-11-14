import { createHash } from "crypto";
import { sendProfessionalEmail } from "@/lib/server-mail";
/** Event callers supply recipients from authorized server records, never arbitrary client input. */
export async function activityEmail(input: { to: string; event: string; title: string; body: string; reference: string; revision?: string | number; href?: string }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.to || ""))) return "unavailable";
  const recipient = input.to.trim().toLowerCase();
  const identity = createHash("sha256").update(JSON.stringify([recipient,input.event,input.reference,input.revision || ""])).digest("hex");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://auronixcommerce.com").replace(/\/+$/, "");
  try {
    const result: any = await sendProfessionalEmail({ to: recipient, subject: input.title,
      body: `${input.body}${input.href && /^\/(?!\/)/.test(input.href) ? `\n\nView in your Auronix workspace: ${site}${input.href}` : ""}\n\nThis is an automatic confirmation of activity in your Auronix account.`,
      idempotencyKey: `activity:${identity}`, deferDelivery: true }, "notification");
    return result?.queued ? "queued" : "sent";
  } catch { return "failed"; } // A mail outage must not undo a successfully completed user action.
}
