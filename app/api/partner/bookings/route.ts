import { adminDb } from "@/lib/firebase-admin";
import {
  partner,
  response,
  failure,
  guard,
  PortalError,
  notify,
} from "@/lib/partner/server";
import { text, validId } from "@/lib/partner/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snapshot = await adminDb
      .ref("partnershipSlots")
      .orderByChild("startsAt")
      .startAt(Date.now())
      .limitToFirst(100)
      .get();
    const slots = Object.entries(snapshot.val() || {})
      .map(([id, s]: any) => ({
        id,
        startsAt: s.startsAt,
        duration: s.duration,
        timeZone: s.timeZone,
        status: s.status,
      }))
      .filter((s) => s.status === "open");
    return response({ slots });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await partner(),
      body = await request.json();
    await guard(request, "partner-booking", body, 10);
    if (!validId(body.slotId))
      throw new PortalError("Choose an available time.");
    const ref = adminDb.ref(`partnershipSlots/${body.slotId}`),
      now = Date.now();
    if (body.action === "cancel") {
      const result = await ref.transaction((s) =>
        !s ||
        s.email !== user.email ||
        s.status !== "booked" ||
        s.startsAt <= now
          ? undefined
          : {
              ...s,
              status: "open",
              email: null,
              bookingId: null,
              bookedAt: null,
            },
      );
      if (!result.committed)
        throw new PortalError(
          "This booking cannot be cancelled here. Contact the team.",
          409,
        );
      await adminDb
        .ref(`partnershipBookings/${body.slotId}-${user.key}`)
        .update({ status: "cancelled", updatedAt: now });
      await notify(
        user.email,
        "Partnership call cancelled",
        "Your call has been cancelled. You can select another available time.",
        "booking",
      );
      return response({ success: true });
    }
    if (body.action !== "book" || body.confirmed !== true)
      throw new PortalError("Review and confirm the booking.");
    const name = text(body.name, 120),
      topic = text(body.topic, 1500);
    if (name.length < 2 || topic.length < 5)
      throw new PortalError(
        "Enter your name and what you would like to discuss.",
      );
    const id = `${body.slotId}-${user.key}`;
    const result = await ref.transaction((s) =>
      !s || s.status !== "open" || s.startsAt <= now
        ? undefined
        : {
            ...s,
            status: "booked",
            email: user.email,
            bookingId: id,
            bookedAt: now,
          },
    );
    if (!result.committed)
      throw new PortalError(
        "That time was just booked. Refresh and choose another.",
        409,
      );
    const slot = result.snapshot.val();
    const booking = {
      id,
      slotId: body.slotId,
      email: user.email,
      name,
      topic,
      startsAt: slot.startsAt,
      duration: slot.duration,
      timeZone: slot.timeZone || "UTC",
      meetingUrl: slot.meetingUrl || "",
      status: "confirmed",
      createdAt: now,
    };
    try {
      await adminDb.ref(`partnershipBookings/${id}`).set(booking);
    } catch (error) {
      await ref.transaction((s) =>
        s?.bookingId === id
          ? {
              ...s,
              status: "open",
              email: null,
              bookingId: null,
              bookedAt: null,
            }
          : undefined,
      );
      throw error;
    }
    const emailStatus = await notify(
      user.email,
      "Your Auronix partnership call is booked",
      `Your call is confirmed for ${new Date(slot.startsAt).toISOString()} (${slot.duration} minutes). ${slot.meetingUrl ? "Join: " + slot.meetingUrl : "The team will send connection details before your call."}`,
      "booking",
      id,
    );
    return response({ success: true, booking, emailStatus });
  } catch (error) {
    return failure(error);
  }
}
