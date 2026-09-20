import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { getPrivateObject, safeObjectName } from '@/lib/server-r2';
import { sendProfessionalEmail } from '@/lib/server-mail';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
const clean = (value: unknown, max = 1000) => String(value ?? '').trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(request: Request) {
  try {
    await requireAdmin(request); const url = new URL(request.url); const supplierId = clean(url.searchParams.get('supplierId'), 160); const documentId = clean(url.searchParams.get('documentId'), 160);
    const snapshot = await adminDb.ref(`suppliers/${supplierId}/documents/${documentId}`).get(); if (!snapshot.exists()) return fail('Supplier document not found.', 404); const document = snapshot.val(); const object = await getPrivateObject(document.storageKey);
    return new NextResponse(object.body as any, { headers: { 'Content-Type': document.mimeType || object.contentType, 'Content-Disposition': `attachment; filename="${safeObjectName(document.name)}"`, 'Content-Length': String(object.body.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return fail(userFacingError(error, 'Unable to download this supplier document.'), 401); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request); const body = await request.json(); const supplierId = clean(body.supplierId, 160); const documentId = clean(body.documentId, 160); const status = clean(body.status, 30); const note = clean(body.note, 2000);
    if (!['approved', 'rejected', 'expired', 'archived'].includes(status)) return fail('Choose a valid document decision.');
    const [supplierSnapshot, documentSnapshot] = await Promise.all([adminDb.ref(`suppliers/${supplierId}`).get(), adminDb.ref(`suppliers/${supplierId}/documents/${documentId}`).get()]); if (!supplierSnapshot.exists() || !documentSnapshot.exists()) return fail('Supplier document not found.', 404);
    const now = Date.now(); await adminDb.ref(`suppliers/${supplierId}/documents/${documentId}`).update({ status, reviewNote: note, reviewedAt: now, reviewedBy: admin.uid }); await adminDb.ref(`suppliers/${supplierId}`).update({ updatedAt: now });
    const supplier = supplierSnapshot.val(); const subject = `Supplier document ${status}`; const log = adminDb.ref('emailDeliveryLogs').push(); await log.set({ id: log.key, recipient: supplier.email, subject, event: 'supplier-document-status', status: 'queued', createdAt: now, updatedAt: now });
    try { const info: any = await sendProfessionalEmail({ to: supplier.email, name: supplier.contactName, subject, body: `${documentSnapshot.val().name} was marked ${status} by the Auronix review team.${note ? `\n\nReview note: ${note}` : ''}\n\nSupplier reference: ${supplierId}` }, 'notification'); await log.update({ status: 'sent', providerMessageId: clean(info?.messageId, 500), updatedAt: Date.now() }); }
    catch (mailError) { await log.update({ status: 'failed', error: userFacingError(mailError, 'Delivery failed.'), updatedAt: Date.now() }); }
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'SUPPLIER_DOCUMENT_REVIEW', targetType: 'supplierDocument', targetId: documentId, summary: `${status}: ${documentSnapshot.val().name}`, metadata: { supplierId }, request });
    return NextResponse.json({ success: true });
  } catch (error) { return fail(userFacingError(error, 'Unable to review this supplier document.'), 401); }
}
