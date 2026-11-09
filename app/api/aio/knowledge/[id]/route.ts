import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyIdToken } from "@/lib/server-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!/^[\w-]{1,160}$/.test(params.id))
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  const document = (
    await adminDb.ref(`aioKnowledgeDocuments/${params.id}`).get()
  ).val();
  if (!document || document.status !== "approved")
    return NextResponse.json(
      { error: "Source is no longer published." },
      { status: 404 },
    );
  if (document.visibility !== "public") {
    try {
      await verifyIdToken(request);
    } catch {
      return NextResponse.json(
        { error: "Sign in to read this approved source." },
        { status: 401 },
      );
    }
  }
  return new Response(Buffer.from(document.pdf, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="auronix-knowledge.pdf"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
