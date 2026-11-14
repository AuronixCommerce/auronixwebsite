import { adminDb } from "@/lib/firebase-admin";
import { DeveloperError, validId } from "./server";
export async function paymentReceipt(uid: string, id: string) {
  if (!validId(id)) throw new DeveloperError("Invalid receipt.", 400);
  const invoice = (
    await adminDb.ref(`aioDeveloperInvoices/${uid}/${id}`).get()
  ).val();
  if (!invoice || invoice.uid !== uid)
    throw new DeveloperError("Receipt not found.", 404);
  if (
    invoice.status !== "credited" ||
    !invoice.grantId ||
    !invoice.approval ||
    invoice.approval.receivedUsdCents !== invoice.usdCents
  )
    throw new DeveloperError(
      "A receipt is available after verified payment approval.",
      409,
    );
  const grant = (
    await adminDb
      .ref(`aioDeveloperBilling/${uid}/grants/${invoice.grantId}`)
      .get()
  ).val();
  if (!grant || grant.units !== invoice.credits * 1_000_000)
    throw new DeveloperError(
      "Payment confirmation is being reconciled. Contact support.",
      409,
    );
  const line = (s: any) =>
    String(s || "")
      .replace(/[\r\n#*`<>]/g, " ")
      .slice(0, 320);
  return {
    title: `Payment receipt AIO-${id}`,
    subtitle: "VERIFIED MANUAL PAYMENT · AIO DEVELOPER PLATFORM",
    source: "https://auronixcommerce.com/aio/developers/console?tab=billing",
    markdown: `## Auronix Commerce LLC\n\nauronixcommerce.com\n\`business@auronixcommerce.com\`\n\n**Receipt:** AIO-${id}\n**Payment approved:** ${new Date(invoice.creditedAt).toISOString()} (UTC)\n**Developer account:** \`${line(invoice.email)}\`\n\n## Payment received\n\n**Amount:** US$${(invoice.approval.receivedUsdCents / 100).toFixed(2)}\n**Currency:** USD\n**Verified reference:** ${line(invoice.approval.reference)}\n\n## Prepaid AIO credits\n\n**Credits added:** ${invoice.credits}\n**Locked price per credit:** US$${(invoice.pricePerCredit / 100).toFixed(2)}\n**Credit grant:** ${invoice.grantId}\n\nThis receipt confirms an administrator-verified manual payment and the associated prepaid service credits. It is not a tax invoice. API usage is charged separately against your credit balance at published rates.\n\nFor payment corrections or refund review, contact support with this receipt ID. Never send passwords, verification codes, or card credentials.\n\nAPI Terms: \`https://auronixcommerce.com/aio/developers/terms\``,
  };
}
