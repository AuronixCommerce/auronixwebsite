import { randomBytes } from "crypto";
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
import { validId, text } from "@/lib/partner/model";
import { validatePartnerFile, validDocumentType } from "@/lib/document-upload";
import {
  putPrivateObject,
  getPrivateObject,
  safeObjectName,
} from "@/lib/server-r2";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await partner();
    if (Number(request.headers.get("content-length")) > 13 * 1024 * 1024)
      throw new PortalError("Use a file of 12 MB or smaller.", 413);
    const form = await request.formData();
    await guard(request, "partner-document", Object.fromEntries(form), 15);
    const supplier = await ownSupplier(form.get("supplierId"), user.email),
      requestId = form.get("requestId");
    if (
      !validId(requestId) ||
      supplier.requests?.[requestId]?.status !== "open"
    )
      throw new PortalError("Choose an open document request.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new PortalError("Choose a document.");
    const invalid = validatePartnerFile(file);
    if (invalid) throw new PortalError(invalid);
    const type = supplier.requests[requestId].type;
    if (!validDocumentType(type))
      throw new PortalError("Invalid document type.");
    const ref = adminDb.ref(`suppliers/${supplier.id}/documents`).push(),
      now = Date.now(),
      key = `supplier-submissions/${supplier.id}/${now}-${randomBytes(8).toString("hex")}-${safeObjectName(file.name)}`;
    await putPrivateObject(
      key,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    const updates: Record<string, any> = {};
    updates[`suppliers/${supplier.id}/documents/${ref.key}`] = {
      id: ref.key,
      name: safeObjectName(file.name),
      type,
      mimeType: file.type,
      size: file.size,
      storageKey: key,
      status: "pending",
      uploadedAt: now,
      uploadedByRole: "supplier",
      requestId,
    };
    updates[`suppliers/${supplier.id}/requests/${requestId}/status`] =
      "uploaded";
    updates[`suppliers/${supplier.id}/updatedAt`] = now;
    await adminDb.ref().update(updates);
    await timeline(supplier.id, {
      type: "document-upload",
      title: "Requested document uploaded",
      message: safeObjectName(file.name),
      actor: "supplier",
    });
    return response({ success: true });
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  try {
    const user = await partner(),
      url = new URL(request.url),
      supplier = await ownSupplier(
        url.searchParams.get("supplierId"),
        user.email,
      ),
      id = url.searchParams.get("id");
    if (!validId(id) || !supplier.documents?.[id])
      throw new PortalError("Document not found.", 404);
    const doc = supplier.documents[id],
      object = await getPrivateObject(doc.storageKey);
    return new Response(new Uint8Array(object.body), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeObjectName(text(doc.name))}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
