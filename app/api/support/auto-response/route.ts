import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { autoReplyToTicket } from "@/lib/support/offline";
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      ...(await autoReplyToTicket(String(body.ticketId || ""))),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to send the automatic reply. The ticket is saved for review.",
      },
      { status: 503 },
    );
  }
}
