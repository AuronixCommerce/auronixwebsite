import { scheduleAccountEvents, queueEvent } from "./events";
import { COMPANY } from "@/lib/constants";
import { adminDb } from "@/lib/firebase-admin";
import { sendProfessionalEmail } from "@/lib/server-mail";
import { account, clean, DeveloperError, grant, hash, validId } from "./server";
import { CREDIT_UNITS, API_TERMS_VERSION } from "./model";
export async function invoice(uid: string, id: string) {
  if (!validId(uid) || !validId(id))
    throw new DeveloperError("Invalid invoice.");
  const value = (
    await adminDb.ref(`aioDeveloperInvoices/${uid}/${id}`).get()
  ).val();
  if (!value || value.uid !== uid)
    throw new DeveloperError("Invoice not found.", 404);
  return value;
}
export async function syncInvoice(uid: string, id: string, value: any) {
  await adminDb
    .ref(`aioDeveloperInvoiceQueue/${id}`)
    .transaction((current) =>
      !current || Number(current.version || 0) <= Number(value.version || 0)
        ? value
        : undefined,
    );
}
async function changeInvoice(
  uid: string,
  id: string,
  change: (current: any) => any,
) {
  await invoice(uid, id);
  let reason = "";
  const r = await adminDb
    .ref(`aioDeveloperInvoices/${uid}/${id}`)
    .transaction((v) => {
      reason = "";
      try {
        const next = change(v);
        return {
          ...next,
          version: Number(v.version || 0) + 1,
          updatedAt: Date.now(),
        };
      } catch (e) {
        reason =
          e instanceof Error
            ? e.message
            : "Invoice changed. Refresh and retry.";
        return;
      }
    });
  if (!r.committed)
    throw new DeveloperError(
      reason || "Invoice changed. Refresh and retry.",
      409,
    );
  const value = r.snapshot.val();
  // The owner record is authoritative. Admin queue reads reconcile a missed mirror write.
  await syncInvoice(uid, id, value).catch(() => undefined);
  return value;
}
export async function notifyInvoice(value: any, message: string) {
  try {
    await sendProfessionalEmail(
      {
        to: value.email,
        subject: `AIO credit request ${value.id}: ${value.status.replaceAll("_", " ")}`,
        text: `${message}\n\nRequest: ${value.id}\nCredits: ${value.credits}\nUSD quote: $${(value.usdCents / 100).toFixed(2)}\n\nOpen Billing: https://auronixcommerce.com/aio/developers/console?tab=billing`,
      },
      "notification",
    );
    return "Email accepted for delivery.";
  } catch {
    return "Email could not be queued; the update is visible in Billing.";
  }
}
export async function updateInvoice(
  uid: string,
  id: string,
  action: string,
  b: any,
  actorUid: string,
) {
  const note = clean(b.note, 2000),
    instructions = clean(b.instructions, 3000);
  if (!note) throw new DeveloperError("Add a note for the developer.");
  const result = await changeInvoice(uid, id, (v) => {
    if (["credited", "approving", "cancelled", "rejected"].includes(v.status))
      throw Error("This request is closed or approval is already processing.");
    if (action === "send-instructions") {
      if (instructions.length < 20)
        throw Error("Enter your real payment destination and instructions.");
      return {
        ...v,
        status: "awaiting_payment",
        instructions,
        adminNote: note,
        reviewedBy: actorUid,
        reviewedAt: Date.now(),
      };
    }
    if (action === "request-information" || action === "reject")
      return {
        ...v,
        status: action === "reject" ? "rejected" : "needs_information",
        adminNote: note,
        reviewedBy: actorUid,
        reviewedAt: Date.now(),
      };
    throw Error("Unknown invoice review action.");
  });
  return {
    invoice: result,
    message: `Payment request updated. ${await notifyInvoice(result, note + (action === "send-instructions" ? "\n\nPayment instructions:\n" + instructions + "\n\nSend only to this verified destination and include the request ID. Submit your transfer reference in Billing afterward. Credits require admin verification." : ""))}`,
  };
}
export async function notifyPaymentReview(
  value: any,
  event = "Payment submitted for review",
) {
  try {
    await sendProfessionalEmail(
      {
        to: process.env.ADMIN_NOTIFICATION_EMAIL || COMPANY.email,
        subject: `AIO API: ${event} · ${value.id}`,
        text: `${event}.\nRequest: ${value.id}\nDeveloper: ${value.email}\nCredits: ${value.credits}\nUSD quote: $${(value.usdCents / 100).toFixed(2)}\n\nReview in the authenticated admin panel: https://auronixcommerce.com/admin/developers\n\nIndependently verify actual payment before granting credits.`,
        idempotencyKey: `aio-payment-review:${value.id}:${value.version || 1}`,
      },
      "notification",
    );
  } catch {
    /* Admin queue remains authoritative when email is unavailable. */
  }
}
export async function submitPayment(uid: string, id: string, b: any) {
  await account(uid, true);
  const reference = clean(b.reference, 160),
    method = clean(b.method, 80),
    note = clean(b.note, 1000);
  if (
    reference.length < 4 ||
    method.length < 2 ||
    b.confirmed !== true ||
    b.termsAccepted !== true
  )
    throw new DeveloperError(
      "Enter your transfer reference and payment method, confirm you sent payment, and accept the API billing terms.",
    );
  const result = await changeInvoice(uid, id, (v) => {
    if (
      !["awaiting_payment", "needs_information"].includes(v.status) ||
      !v.instructions
    )
      throw Error(
        "Wait for payment instructions from the team before submitting a transfer reference.",
      );
    return {
      ...v,
      status: "payment_submitted",
      submission: { reference, method, note, submittedAt: Date.now() },
      termsVersion: API_TERMS_VERSION,
      termsAcceptedAt: Date.now(),
    };
  });
  await notifyPaymentReview(result);
  return {
    invoice: result,
    message:
      "Payment reference submitted for admin verification. No credits have been added yet.",
  };
}
export async function cancelInvoice(uid: string, id: string) {
  return changeInvoice(uid, id, (v) => {
    if (!["requested", "awaiting_payment"].includes(v.status) || v.submission)
      throw Error(
        "A request with submitted payment must be reviewed by the team.",
      );
    return { ...v, status: "cancelled", cancelledAt: Date.now() };
  });
}
async function claimReceipt(
  uid: string,
  id: string,
  units: number,
  actorUid: string,
  reference: string,
) {
  if (
    !Number.isSafeInteger(units) ||
    units < 1 ||
    units > 1_000_000 * CREDIT_UNITS ||
    !reference
  )
    throw new DeveloperError(
      "Enter a valid positive credit amount and receipt reference.",
    );
  // Receipt references are unique across accounts, not just within one wallet.
  const key = hash(reference.trim().toLowerCase());
  const claim = await adminDb
    .ref(`aioDeveloperPaymentReferences/${key}`)
    .transaction((v) => {
      if (v && (v.uid !== uid || v.grantId !== id || v.units !== units)) return;
      return v || { uid, grantId: id, units, actorUid, createdAt: Date.now() };
    });
  if (!claim.committed)
    throw new DeveloperError(
      "This payment reference is already assigned to another credit grant.",
      409,
    );
}
export async function recordCredit(
  uid: string,
  id: string,
  units: number,
  actorUid: string,
  reference: string,
  reason: string,
  event?: any,
) {
  await claimReceipt(uid, id, units, actorUid, reference);
  const previous = (
    await adminDb.ref(`aioDeveloperBilling/${uid}/grants/${id}`).get()
  ).val();
  if (previous) {
    if (
      previous.units !== units ||
      previous.reference.toLowerCase() !== reference.toLowerCase()
    )
      throw new DeveloperError(
        "This credit grant was already recorded with different details.",
        409,
      );
    return {
      balance: (
        await adminDb.ref(`aioDeveloperBilling/${uid}/balance`).get()
      ).val(),
      duplicate: true,
    };
  }
  return {
    balance: await grant(uid, id, units, actorUid, reference, reason, event),
    duplicate: false,
  };
}
export async function approvePayment(
  uid: string,
  id: string,
  b: any,
  actorUid: string,
) {
  await account(uid, true);
  const reference = clean(b.reference, 160),
    reason = clean(b.reason, 1000);
  if (
    !reference ||
    !reason ||
    b.paymentVerified !== true ||
    !Number.isSafeInteger(b.receivedUsdCents)
  )
    throw new DeveloperError(
      "Verify the actual received USD amount, receipt reference, and reason before approval.",
    );
  const existing = await invoice(uid, id);
  const grantId = hash("invoice:" + id);
  if (existing.status === "credited") {
    if (
      existing.approval?.reference !== reference ||
      existing.usdCents !== b.receivedUsdCents
    )
      throw new DeveloperError(
        "This payment was already approved with different verification details.",
        409,
      );
    return {
      invoice: existing,
      balance: (
        await adminDb.ref(`aioDeveloperBilling/${uid}/balance`).get()
      ).val(),
      message:
        "This payment was already credited. No additional credits were added.",
    };
  }
  if (
    !["payment_submitted", "approving"].includes(existing.status) ||
    existing.usdCents !== b.receivedUsdCents
  )
    throw new DeveloperError(
      "Wait for a submitted payment and verify the exact locked USD amount before approval.",
      409,
    );
  if (existing.approval && existing.approval.reference !== reference)
    throw new DeveloperError(
      "Use the original receipt reference to resume this approval.",
      409,
    );
  await claimReceipt(
    uid,
    grantId,
    existing.credits * CREDIT_UNITS,
    actorUid,
    reference,
  );
  const locked = await changeInvoice(uid, id, (v) => {
    if (!["payment_submitted", "approving"].includes(v.status))
      throw Error(
        "The developer must submit a payment reference before approval.",
      );
    if (v.usdCents !== b.receivedUsdCents)
      throw Error(
        "The received amount must match the locked invoice quote. Request clarification for a mismatch.",
      );
    if (
      v.approval &&
      (v.approval.reference !== reference ||
        v.approval.receivedUsdCents !== b.receivedUsdCents)
    )
      throw Error(
        "Use the original receipt reference and amount to resume this approval.",
      );
    return {
      ...v,
      status: "approving",
      approval: v.approval || {
        reference,
        reason,
        actorUid,
        receivedUsdCents: b.receivedUsdCents,
        createdAt: Date.now(),
      },
    };
  });
  const paymentEvent = {
    id: hash(uid + ":payment:" + id),
    type: "payment.approved",
    createdAt: Date.now(),
    data: {
      request_id: id,
      credits: locked.credits,
      amount_usd_cents: locked.usdCents,
      currency: "USD",
    },
  };
  const credited = await recordCredit(
    uid,
    grantId,
    locked.credits * CREDIT_UNITS,
    actorUid,
    reference,
    reason,
    paymentEvent,
  );
  const result = await changeInvoice(uid, id, (v) => {
    if (v.status !== "approving")
      throw Error("Payment approval state changed. Refresh the request.");
    return { ...v, status: "credited", creditedAt: Date.now(), grantId };
  });
  try {
    await queueEvent(uid, paymentEvent);
    await scheduleAccountEvents(uid);
  } catch {
    /* The wallet outbox persists until the next delivery attempt. */
  }
  return {
    invoice: result,
    balance: credited.balance,
    message: `Payment approved and ${locked.credits} credits recorded. ${await notifyInvoice(result, "Your payment was verified and the credits are now available in your AIO wallet. Verified receipt reference: " + reference)}`,
  };
}
