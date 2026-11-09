import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server-auth";
import {
  updateAuthenticatedAioConversation,
  deleteAuthenticatedAioConversation,
  getAuthenticatedAioConversation,
  listAuthenticatedAioConversations,
} from "@/lib/aio/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await verifyIdToken(request);
    const id = new URL(request.url).searchParams.get("id") || "";

    if (id) {
      const conversation = await getAuthenticatedAioConversation(user.uid, id);
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { conversation },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const conversations = await listAuthenticatedAioConversations(
      user.uid,
      new URL(request.url).searchParams.get("q") || "",
    );
    return NextResponse.json(
      { conversations },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Sign in to access saved AIO conversations." },
      { status: 401 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyIdToken(request);
    const body = await request.json();
    const deleted = await deleteAuthenticatedAioConversation(
      user.uid,
      String(body?.id || ""),
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Invalid conversation." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete this conversation." },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  let user;
  try {
    user = await verifyIdToken(request);
  } catch {
    return NextResponse.json(
      { error: "Sign in to update saved conversations." },
      { status: 401 },
    );
  }
  try {
    const body = await request.json();
    const title = body.title;
    if (
      (title !== undefined &&
        (typeof title !== "string" || !title.trim() || title.length > 100)) ||
      (title === undefined &&
        (typeof body.messageId !== "string" ||
          typeof body.pinned !== "boolean"))
    )
      return NextResponse.json(
        { error: "Invalid conversation changes." },
        { status: 400 },
      );
    const updated = await updateAuthenticatedAioConversation(
      user.uid,
      String(body.id || ""),
      title !== undefined
        ? { title }
        : { messageId: body.messageId, pinned: body.pinned },
    );
    return NextResponse.json(
      updated
        ? { success: true }
        : { error: "Conversation or answer not found." },
      { status: updated ? 200 : 404 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to update this conversation." },
      { status: 503 },
    );
  }
}
