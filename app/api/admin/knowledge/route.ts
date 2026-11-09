import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import {
  extractPdfKnowledge,
  KNOWLEDGE_LIMIT,
  publishKnowledgeDocument,
  withdrawKnowledgeDocument,
} from "@/lib/aio/knowledge-documents";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function summary(id: string, d: any) {
  return {
    id,
    title: d.title,
    fileName: d.fileName,
    text: d.text,
    status: d.status,
    visibility: d.visibility,
    pageCount: d.pageCount,
    createdAt: d.createdAt,
    reviewedAt: d.reviewedAt || null,
  };
}
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }
  const records =
    (await adminDb.ref("aioKnowledgeDocuments").get()).val() || {};
  return NextResponse.json(
    {
      documents: Object.entries(records)
        .map(([id, d]) => summary(id, d))
        .sort((a, b) => b.createdAt - a.createdAt),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }
  try {
    if (
      Number(request.headers.get("content-length")) >
      KNOWLEDGE_LIMIT + 30_000
    )
      return NextResponse.json(
        { error: "PDF must be 3 MB or smaller." },
        { status: 413 },
      );
    const form = await request.formData(),
      file = form.get("file");
    if (
      !file ||
      typeof file === "string" ||
      file.size > KNOWLEDGE_LIMIT ||
      !/\.pdf$/i.test(file.name)
    )
      throw new Error("Choose a PDF file up to 3 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer()),
      extracted = await extractPdfKnowledge(bytes);
    const ref = adminDb.ref("aioKnowledgeDocuments").push();
    const document = {
      title: String(form.get("title") || file.name)
        .trim()
        .slice(0, 180),
      fileName: file.name.slice(0, 180),
      pdf: Buffer.from(bytes).toString("base64"),
      ...extracted,
      visibility: "authenticated",
      status: "pending",
      createdAt: Date.now(),
      uploadedBy: admin.uid,
    };
    await ref.set(document);
    return NextResponse.json(
      { document: summary(ref.key!, document) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to extract the PDF.",
      },
      { status: 400 },
    );
  }
}
const reviewSchema = z.object({
  id: z.string().regex(/^[\w-]{1,160}$/),
  action: z.enum(["approve", "withdraw"]),
  title: z.string().trim().min(1).max(180).optional(),
  text: z.string().trim().min(30).max(120000).optional(),
  visibility: z.enum(["public", "authenticated"]).optional(),
});
export async function PATCH(request: Request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Review the document fields." },
      { status: 400 },
    );
  const { id, action, ...changes } = parsed.data,
    ref = adminDb.ref(`aioKnowledgeDocuments/${id}`),
    document = (await ref.get()).val();
  if (!document)
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  // Withdraw existing chunks before replacing approved text; edits never retain an earlier approval.
  await withdrawKnowledgeDocument(id);
  if (action === "approve") {
    const reviewed = { ...document, ...changes };
    await ref.update({ ...changes, status: "pending", updatedAt: Date.now() });
    await publishKnowledgeDocument(id, reviewed, admin.uid);
  }
  return NextResponse.json({ success: true });
}
