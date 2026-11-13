import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { writeAuditLog } from "@/lib/server-audit";
import {
  response,
  failure,
  sameOrigin,
  PortalError,
  timeline,
  notify,
} from "@/lib/partner/server";
import { text, validId, DEFAULT_TEMPLATES } from "@/lib/partner/model";
import { validDocumentType } from "@/lib/document-upload";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const values = (v: any) =>
  Object.entries(v || {}).map(([id, item]: any) => ({ ...item, id }));
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    if (new URL(request.url).searchParams.get("view") === "templates") {
      const s = await adminDb.ref("settings/replyTemplates").get();
      return response({ templates: s.val() || DEFAULT_TEMPLATES });
    }
    const [suppliers, slots, bookings, feedback, templates, insights] =
      await Promise.all(
        [
          "suppliers",
          "partnershipSlots",
          "partnershipBookings",
          "websiteFeedback",
          "settings/replyTemplates",
          "siteInsights",
        ].map((path) =>
          adminDb
            .ref(path)
            .limitToLast(path === "siteInsights" ? 30 : 200)
            .get(),
        ),
      );
    const events = Object.values(insights.val() || {})
      .flatMap((day: any) => Object.values(day))
      .filter(
        (event: any) => Number(event.createdAt) >= Date.now() - 30 * 86400000,
      ) as any[];
    const starts = new Set(
        events
          .filter((e) => e.event === "supplier_start")
          .map((e) => e.session),
      ),
      completed = new Set(
        events
          .filter((e) => e.event === "supplier_submit")
          .map((e) => e.session),
      );
    return response({
      suppliers: values(suppliers.val()).sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
      slots: values(slots.val()).sort((a, b) => a.startsAt - b.startsAt),
      bookings: values(bookings.val()),
      feedback: values(feedback.val()).sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
      templates: templates.val() || DEFAULT_TEMPLATES,
      analytics: {
        days: 30,
        starts: starts.size,
        submitted: completed.size,
        incomplete: Array.from(starts).filter((s) => !completed.has(s)).length,
        events: EVENT_COUNTS(events),
        bySection: [
          "company",
          "business",
          "documents",
          "commercial",
          "review",
        ].map((section) => ({
          section,
          count: events.filter(
            (e) => e.event === "supplier_section" && e.section === section,
          ).length,
        })),
        videos: ["overview", "supplier"].map((video) => ({
          video,
          started: events.filter(
            (e) => e.video === video && e.event === "video_start",
          ).length,
          completed: events.filter(
            (e) => e.video === video && e.event === "video_complete",
          ).length,
        })),
      },
    });
  } catch (error) {
    return authFailure(error);
  }
}
function EVENT_COUNTS(events: any[]) {
  return events.reduce(
    (a, e) => ({ ...a, [e.event]: (a[e.event] || 0) + 1 }),
    {} as Record<string, number>,
  );
}
function authFailure(error: unknown) {
  if (error instanceof PortalError) return failure(error);
  if (
    error instanceof Error &&
    /auth|token|admin|two-factor|session/i.test(error.message)
  )
    return response({ error: "Administrator sign-in is required." }, 401);
  return failure(error);
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    sameOrigin(request);
    const body = await request.json();
    const action = text(body.action, 50),
      now = Date.now();
    let result: any = { success: true };
    if (
      ["note", "reply", "request-document", "resolve-request"].includes(action)
    ) {
      if (!validId(body.supplierId))
        throw new PortalError("Choose a supplier.");
      const ref = adminDb.ref(`suppliers/${body.supplierId}`),
        supplier = (await ref.get()).val();
      if (!supplier) throw new PortalError("Supplier not found.", 404);
      if (action === "note" || action === "reply") {
        const message = text(body.message, 5000);
        if (!message) throw new PortalError("Enter a message.");
        await timeline(body.supplierId, {
          type: action,
          title:
            action === "note" ? "Internal review note" : "Reply from Auronix",
          message,
          actor: action === "note" ? admin.uid : "Auronix team",
          visibility: action === "note" ? "internal" : "public",
        });
        if (action === "reply")
          result.emailStatus = await notify(
            supplier.email,
            text(body.subject, 160) ||
              "An update from your Auronix review team",
            message,
            "supplier-reply",
            body.supplierId,
          );
      }
      if (action === "request-document") {
        if (!validDocumentType(body.type))
          throw new PortalError("Choose a document type.");
        const title = text(body.title, 160),
          message = text(body.message, 2000);
        if (!title) throw new PortalError("Name the requested document.");
        const requestRef = ref.child("requests").push();
        await requestRef.set({
          id: requestRef.key,
          type: body.type,
          title,
          message,
          status: "open",
          createdAt: now,
        });
        await timeline(body.supplierId, {
          type: "document-request",
          title: "Document requested: " + title,
          message,
          actor: "Auronix team",
        });
        result.emailStatus = await notify(
          supplier.email,
          "Document requested: " + title,
          message ||
            "Open your secure workspace to upload the requested document.",
          "document-request",
          body.supplierId,
        );
      }
      if (action === "resolve-request") {
        if (!validId(body.requestId) || !supplier.requests?.[body.requestId])
          throw new PortalError("Request not found.");
        await ref
          .child(`requests/${body.requestId}`)
          .update({ status: "resolved", resolvedAt: now });
        await timeline(body.supplierId, {
          type: "document-request",
          title: "Document request completed",
          message: supplier.requests[body.requestId].title,
          actor: "Auronix team",
        });
      }
      await ref.update({ updatedAt: now });
    } else if (action === "templates") {
      if (!Array.isArray(body.templates) || body.templates.length > 20)
        throw new PortalError("Use up to 20 templates.");
      const templates = body.templates.map((t: any, i: number) => ({
        id: validId(t.id) ? t.id : "template-" + i,
        title: text(t.title, 100),
        subject: text(t.subject, 160),
        body: text(t.body, 5000),
      }));
      if (templates.some((t: any) => !t.title || !t.subject || !t.body))
        throw new PortalError("Complete each template.");
      await adminDb.ref("settings/replyTemplates").set(templates);
    } else if (action === "create-slot") {
      const startsAt = Number(body.startsAt),
        duration = Number(body.duration),
        timeZone = text(body.timeZone, 100) || "UTC";
      try {
        new Intl.DateTimeFormat("en", { timeZone });
      } catch {
        throw new PortalError("Enter a valid time zone.");
      }
      if (
        !Number.isFinite(startsAt) ||
        startsAt < now + 15 * 60000 ||
        ![15, 30, 45, 60].includes(duration)
      )
        throw new PortalError("Choose a future time and valid duration.");
      const meetingUrl = text(body.meetingUrl, 1000);
      if (meetingUrl && !/^https:\/\//i.test(meetingUrl))
        throw new PortalError("Use a secure meeting link.");
      const ref = adminDb.ref("partnershipSlots").push();
      const slot = {
        id: ref.key,
        startsAt,
        duration,
        timeZone,
        meetingUrl,
        status: "open",
        createdAt: now,
      };
      const created = await adminDb
        .ref("partnershipSlots")
        .transaction((all) => {
          const slots = values(all);
          if (
            slots.some(
              (s) =>
                s.status !== "cancelled" &&
                startsAt < s.startsAt + s.duration * 60000 &&
                startsAt + duration * 60000 > s.startsAt,
            )
          )
            return;
          return { ...(all || {}), [String(ref.key)]: slot };
        });
      if (!created.committed)
        throw new PortalError(
          "This time overlaps another published slot.",
          409,
        );
    } else if (action === "cancel-slot") {
      if (!validId(body.slotId)) throw new PortalError("Choose a slot.");
      const ref = adminDb.ref(`partnershipSlots/${body.slotId}`),
        prior = (await ref.get()).val();
      if (!prior) throw new PortalError("Slot not found.");
      const changed = await ref.transaction((s) =>
        s && s.status !== "cancelled"
          ? { ...s, status: "cancelled", updatedAt: now }
          : undefined,
      );
      if (!changed.committed) throw new PortalError("Slot already cancelled.");
      const slot = changed.snapshot.val();
      if (slot.email && slot.bookingId) {
        await adminDb
          .ref(`partnershipBookings/${slot.bookingId}`)
          .update({ status: "cancelled", updatedAt: now });
        result.emailStatus = await notify(
          slot.email,
          "Partnership call cancelled by the team",
          "Your call has been cancelled. Please choose another available time or contact the team.",
          "booking",
          slot.bookingId,
        );
      }
    } else if (action === "feedback-status") {
      if (
        !validId(body.id) ||
        !["new", "reviewing", "resolved"].includes(body.status) ||
        (await adminDb.ref(`websiteFeedback/${body.id}`).get()).exists() ===
          false
      )
        throw new PortalError("Choose valid feedback.");
      await adminDb
        .ref(`websiteFeedback/${body.id}`)
        .update({ status: body.status, updatedAt: now });
    } else throw new PortalError("Choose a valid action.");
    await writeAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: "PARTNER_" + action.toUpperCase().replace(/-/g, "_"),
      targetType: "partnerOperations",
      targetId: text(body.supplierId || body.slotId || body.id, 160),
      summary: action,
      request,
    });
    return response(result);
  } catch (error) {
    return authFailure(error);
  }
}
