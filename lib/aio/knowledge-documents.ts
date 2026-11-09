import { adminDb } from "@/lib/firebase-admin";
export const KNOWLEDGE_LIMIT = 3 * 1024 * 1024;
export async function extractPdfKnowledge(bytes: Uint8Array) {
  if (
    bytes.length > KNOWLEDGE_LIMIT ||
    !Buffer.from(bytes.slice(0, 1024)).includes(Buffer.from("%PDF-"))
  )
    throw new Error("Upload a PDF up to 3 MB.");
  const [{ getDocument }, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  // Explicitly importing the worker keeps both package assets in the serverless trace.
  // PDF.js uses this handler for its Node.js in-process text extraction worker.
  (globalThis as any).pdfjsWorker = worker;
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    stopAtErrors: true,
  });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > 60) throw new Error("Use a PDF with 60 pages or fewer.");
    const pages: string[] = [];
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      pages.push(
        content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("")
          .trim(),
      );
      if (pages.join("").length > 120_000)
        throw new Error(
          "This document contains too much text. Split it into smaller PDFs.",
        );
    }
    const text = pages.map((p, i) => `[Page ${i + 1}]\n${p}`).join("\n\n");
    if (pages.join("").trim().length < 30)
      throw new Error(
        "No readable text found. Upload a searchable PDF; scanned documents need OCR first.",
      );
    return { text, pageCount: pdf.numPages };
  } finally {
    await pdf.destroy();
  }
}
export async function publishKnowledgeDocument(
  id: string,
  document: any,
  adminUid: string,
) {
  const updates: Record<string, any> = {};
  // Whole-word chunks preserve all approved text, rather than silently discarding later PDF pages.
  const chunks: string[] = [];
  const text = String(document.text);
  for (let offset = 0; offset < text.length; offset += 3500)
    chunks.push(text.slice(offset, offset + 3500));
  for (let i = 0; i < Math.ceil(String(document.text).length / 3500); i++)
    updates[`aioKnowledge/pdf-${id}-${i}`] = null;
  for (const [i, content] of Array.from(chunks.entries()))
    updates[`aioKnowledge/pdf-${id}-${i}`] = {
      title: `${document.title} · section ${i + 1}`,
      content,
      summary: content.slice(0, 500),
      status: "approved",
      active: true,
      documentId: id,
      visibility: document.visibility,
      route: `/aio/sources/${id}`,
      category: "company documents",
      updatedAt: new Date().toISOString(),
      reviewedBy: adminUid,
    };
  updates[`aioKnowledgeDocuments/${id}/status`] = "approved";
  updates[`aioKnowledgeDocuments/${id}/reviewedBy`] = adminUid;
  updates[`aioKnowledgeDocuments/${id}/reviewedAt`] = Date.now();
  await adminDb.ref().update(updates);
}
export async function withdrawKnowledgeDocument(id: string) {
  const entries = (await adminDb.ref("aioKnowledge").get()).val() || {};
  const updates: Record<string, any> = {
    [`aioKnowledgeDocuments/${id}/status`]: "withdrawn",
    [`aioKnowledgeDocuments/${id}/updatedAt`]: Date.now(),
  };
  for (const [key, value] of Object.entries(entries) as [string, any][])
    if (value.documentId === id) updates[`aioKnowledge/${key}`] = null;
  await adminDb.ref().update(updates);
}
