import { createHash } from "crypto";
import { userFacingError } from "@/lib/user-facing-error";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { generateGroqResponse } from "@/lib/server-groq";
import { sendTicketResponseEmail } from "@/lib/server-mail";

import { verifyIdToken } from "@/lib/server-auth";
import { autoReplyToTicket } from "@/lib/support/offline";
import { protectPublicRequest } from "@/lib/server-protection";
export async function POST(request: Request) {
  let user;
  try {
    user = await verifyIdToken(request);
  } catch {
    user = null;
  }
  try {
    const body = await request.json();
    await protectPublicRequest(request, "support-reply", body, {
      limit: 20,
      windowMs: 60 * 60_000,
    });
    const id = String(body.ticketId || ""),
      message = String(body.message || "").trim();
    if (!/^[\w-]{1,160}$/.test(id) || !message || message.length > 5000)
      return NextResponse.json(
        { error: "Review the ticket and message." },
        { status: 400 },
      );
    const ref = adminDb.ref(`tickets/${id}`),
      ticket = (await ref.get()).val();
    const owned =
      !!user && (ticket?.sellerUid === user.uid || ticket?.uid === user.uid);
    const token = String(body.replyToken || "");
    const tokenValid =
      /^[a-f0-9]{64}$/.test(token) &&
      ticket?.replyTokenHash ===
        createHash("sha256").update(token).digest("hex");
    if (!ticket || (!owned && !tokenValid))
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    await ref
      .child("messages")
      .push()
      .set({ role: "customer", content: message, createdAt: Date.now() });
    await ref.update({
      status: "open",
      updatedAt: Date.now(),
      lastCustomerReplyAt: Date.now(),
    });
    const automated = await autoReplyToTicket(id).catch(() => ({
      automated: false,
    }));
    return NextResponse.json({ success: true, ...automated });
  } catch {
    return NextResponse.json(
      { error: "Unable to save this reply." },
      { status: 503 },
    );
  }
}
