import { parseNotice } from "@/lib/developers/changelog";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { writeAuditLog } from "@/lib/server-audit";
import { sendProfessionalEmail } from "@/lib/server-mail";
import {
  bodyJson,
  clean,
  DeveloperError,
  fail,
  getPricing,
  hash,
  json,
  page,
  rateLimit,
  sameOrigin,
  validId,
  wallet,
} from "@/lib/developers/server";
import {
  updateInvoice,
  approvePayment,
  recordCredit,
  invoice as getInvoice,
} from "@/lib/developers/payments";
import { CREDIT_UNITS, parsePricing } from "@/lib/developers/model";
export const dynamic = "force-dynamic";
async function admin(request: Request) {
  try {
    return await requireAdmin(request);
  } catch {
    throw new DeveloperError(
      "Administrator access and two-factor verification are required.",
      403,
    );
  }
}
export async function GET(request: Request) {
  try {
    const actor = await admin(request);
    await rateLimit(actor.uid, "admin-developers", 60);
    const url = new URL(request.url),
      uid = url.searchParams.get("uid"),
      cursor = url.searchParams.get("cursor") || "";
    if (uid) {
      if (!validId(uid)) throw new DeveloperError("Invalid account.");
      const profile = (
        await adminDb.ref(`aioDeveloperAccounts/${uid}`).get()
      ).val();
      if (!profile) throw new DeveloperError("Account not found.", 404);
      return json({
        account: profile,
        wallet: await wallet(uid),
        usage: await page(`aioDeveloperUsage/${uid}`),
        invoices: await page(`aioDeveloperInvoices/${uid}`),
        grants: Object.values<any>(
          (
            await adminDb.ref(`aioDeveloperBilling/${uid}/grants`).get()
          ).val() || {},
        )
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50),
      });
    }
    const invoices = async (next = "") => {
      const list = await page("aioDeveloperInvoiceQueue", next);
      const items = await Promise.all(
        list.items.map(async (v: any) => {
          try {
            return await getInvoice(v.uid, v.id);
          } catch {
            return null;
          }
        }),
      );
      return { ...list, items: items.filter(Boolean) };
    };
    if (url.searchParams.get("view") === "notices")
      return json(await page("aioApiNotices", cursor));
    if (url.searchParams.get("view") === "invoices")
      return json(await invoices(cursor));
    return json({
      accounts: await page("aioDeveloperAccounts", cursor),
      invoices: await invoices(),
      pricing: await getPricing(),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await admin(request),
      b = await bodyJson(request, 12_000);
    await rateLimit(actor.uid, "admin-developer-write", 60);
    if (b.action === "pricing") {
      let pricing;
      try {
        pricing = parsePricing(b.pricing);
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
      // Write an audit record before making a pricing change effective.
      await writeAuditLog({
        actorUid: actor.uid,
        action: "aio.api.pricing",
        targetType: "api-pricing",
        summary: "Published AIO API rates",
        metadata: { pricing },
        request,
      });
      await adminDb.ref("settings/aioDeveloperApi").set(pricing);
      return json({ message: "API pricing saved." });
    }
    if (b.action === "notice") {
      let value;
      try {
        value = parseNotice(b);
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
      const id = b.id || adminDb.ref("aioApiNotices").push().key;
      if (!validId(id)) throw new DeveloperError("Invalid notice ID.");
      const prior = (await adminDb.ref(`aioApiNotices/${id}`).get()).val();
      await writeAuditLog({
        actorUid: actor.uid,
        action: "aio.api.notice",
        targetType: "api-notice",
        targetId: id,
        summary: value.title,
        request,
      });
      await adminDb
        .ref(`aioApiNotices/${id}`)
        .set({
          ...value,
          id,
          createdAt: prior?.createdAt || Date.now(),
          updatedAt: Date.now(),
          updatedBy: actor.uid,
        });
      return json({
        message: value.published
          ? "API notice published."
          : "API notice saved as a draft.",
      });
    }
    if (!validId(b.uid))
      throw new DeveloperError("Select a developer account.");
    const profile = (
      await adminDb.ref(`aioDeveloperAccounts/${b.uid}`).get()
    ).val();
    if (!profile) throw new DeveloperError("Developer account not found.", 404);
    if (b.action === "invoice-review") {
      await writeAuditLog({
        actorUid: actor.uid,
        action: "aio.api.invoice." + clean(b.reviewAction, 50),
        targetType: "developer-invoice",
        targetId: clean(b.invoiceId, 128),
        summary: clean(b.note, 1000),
        request,
      });
      return json(
        await updateInvoice(b.uid, b.invoiceId, b.reviewAction, b, actor.uid),
      );
    }
    if (b.action === "status") {
      if (!["approved", "rejected", "suspended"].includes(b.status))
        throw new DeveloperError("Choose a valid status.");
      const note = clean(b.note, 1000);
      if (!note)
        throw new DeveloperError("Add a review note for the developer.");
      await writeAuditLog({
        actorUid: actor.uid,
        action: `aio.api.${b.status}`,
        targetType: "developer-account",
        targetId: b.uid,
        summary: note,
        request,
      });
      await adminDb.ref(`aioDeveloperAccounts/${b.uid}`).update({
        status: b.status,
        reviewNote: note,
        reviewedAt: Date.now(),
        reviewedBy: actor.uid,
      });
      let notification = "Email accepted for delivery.";
      try {
        await sendProfessionalEmail(
          {
            to: profile.email,
            subject: `AIO developer access: ${b.status}`,
            text: `Your AIO API application is now ${b.status}.\n\n${note}\n\nOpen your console: https://auronixcommerce.com/aio/developers/console`,
          },
          "notification",
        );
      } catch {
        notification =
          "Email could not be queued; the status is visible in the console.";
      }
      return json({ message: `Account ${b.status}. ${notification}` });
    }
    if (b.action === "credit") {
      if (profile.status !== "approved")
        throw new DeveloperError(
          "Approve this developer before adding credits.",
        );
      const reference = clean(b.reference, 160),
        reason = clean(b.reason, 1000);
      const units = Math.round(Number(b.credits) * CREDIT_UNITS);
      if (
        !Number.isFinite(b.credits) ||
        b.credits <= 0 ||
        !reference ||
        !reason ||
        b.paymentVerified !== true
      )
        throw new DeveloperError(
          "Verify payment or an authorized promotional grant, then enter its reference, amount, and reason.",
        );
      const invoiceId = clean(b.invoiceId, 128);
      if (invoiceId) {
        const result = await approvePayment(b.uid, invoiceId, b, actor.uid);
        await writeAuditLog({
          actorUid: actor.uid,
          action: "aio.api.payment-approved",
          targetType: "developer-invoice",
          targetId: invoiceId,
          summary: reason,
          metadata: { reference, uid: b.uid },
          request,
        }).catch(() => undefined);
        return json(result);
      }
      const id = hash(`payment:${reference.toLowerCase()}`);
      const { balance } = await recordCredit(
        b.uid,
        id,
        units,
        actor.uid,
        reference,
        reason,
      );
      await writeAuditLog({
        actorUid: actor.uid,
        action: "aio.api.credit",
        targetType: "developer-account",
        targetId: b.uid,
        summary: reason,
        metadata: { units, reference, grantId: id },
        request,
      }).catch(() => undefined);
      return json({
        message:
          "Credits added. The verified grant is recorded in the billing ledger.",
        balance,
      });
    }
    throw new DeveloperError("Unknown administrator action.");
  } catch (e) {
    return fail(e);
  }
}
