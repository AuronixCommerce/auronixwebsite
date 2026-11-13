import { adminDb } from "@/lib/firebase-admin";
import {
  partner,
  ownSupplier,
  response,
  failure,
  guard,
  timeline,
  PortalError,
} from "@/lib/partner/server";
import { cleanDraft, text, validId } from "@/lib/partner/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function values(raw: any) {
  return Object.entries(raw || {}).map(([id, item]: any) => ({ ...item, id }));
}
export async function GET() {
  try {
    const user = await partner();
    const [suppliers, draft, notifications, bookings, tickets] =
      await Promise.all([
        adminDb
          .ref("suppliers")
          .orderByChild("email")
          .equalTo(user.email)
          .limitToLast(30)
          .get(),
        adminDb.ref(`supplierDrafts/${user.key}`).get(),
        adminDb.ref(`partnerNotifications/${user.key}`).limitToLast(100).get(),
        adminDb
          .ref("partnershipBookings")
          .orderByChild("email")
          .equalTo(user.email)
          .limitToLast(30)
          .get(),
        adminDb
          .ref("tickets")
          .orderByChild("email")
          .equalTo(user.email)
          .limitToLast(30)
          .get(),
      ]);
    const submissions = values(suppliers.val()).map((s) => ({
      id: s.id,
      companyName: s.companyName,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      documents: values(s.documents).map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        reviewNote: d.reviewNote || "",
        uploadedAt: d.uploadedAt,
      })),
      requests: values(s.requests),
      timeline: values(s.timeline)
        .filter((t) => t.visibility !== "internal")
        .sort((a, b) => a.createdAt - b.createdAt),
    }));
    return response({
      email: user.email,
      draft: draft.val(),
      submissions,
      notifications: values(notifications.val()).sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
      bookings: values(bookings.val()),
      tickets: values(tickets.val()).map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
        messages: values(t.messages).filter((m) => m.visibility !== "internal"),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await partner(),
      body = await request.json();
    await guard(request, "partner-workspace", body, 40);
    if (body.action === "draft") {
      await adminDb
        .ref(`supplierDrafts/${user.key}`)
        .set({
          form: cleanDraft(body.form, user.email),
          updatedAt: Date.now(),
          email: user.email,
        });
      return response({ success: true });
    }
    if (body.action === "delete-draft") {
      await adminDb.ref(`supplierDrafts/${user.key}`).remove();
      return response({ success: true });
    }
    if (body.action === "read") {
      const base = adminDb.ref(`partnerNotifications/${user.key}`);
      if (body.all === true) {
        const items = values((await base.limitToLast(100).get()).val());
        const updates: Record<string, number> = {};
        for (const item of items) updates[`${item.id}/readAt`] = Date.now();
        if (items.length) await base.update(updates);
      } else if (validId(body.id) && (await base.child(body.id).get()).exists())
        await base.child(body.id).update({ readAt: Date.now() });
      else throw new PortalError("Notification not found.", 404);
      return response({ success: true });
    }
    if (body.action === "reply") {
      const supplier = await ownSupplier(body.supplierId, user.email);
      const message = text(body.message, 5000);
      if (!message) throw new PortalError("Enter a reply.");
      await timeline(supplier.id, {
        type: "reply",
        title: "Your reply",
        message,
        actor: "supplier",
      });
      await adminDb
        .ref(`suppliers/${supplier.id}`)
        .update({ updatedAt: Date.now() });
      return response({ success: true });
    }
    throw new PortalError("Choose a valid workspace action.");
  } catch (error) {
    return failure(error);
  }
}
