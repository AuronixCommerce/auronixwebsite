import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { sendProfessionalEmail } from '@/lib/server-mail';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

const clean = (value: unknown, max = 2000) => String(value ?? '').trim().slice(0, max);
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request); const body = await request.json(); const supplierId = clean(body.supplierId, 160); const status = clean(body.status, 40); const previousStatus = clean(body.previousStatus, 40);
    if (!supplierId || !['new', 'reviewing', 'contacted', 'approved', 'rejected', 'archived'].includes(status)) return NextResponse.json({ error: 'Choose a valid supplier status.' }, { status: 400 });
    const snapshot = await adminDb.ref(`suppliers/${supplierId}`).get(); if (!snapshot.exists()) return NextResponse.json({ error: 'Supplier submission not found.' }, { status: 404 }); const supplier = snapshot.val(); const now = Date.now(); await adminDb.ref(`suppliers/${supplierId}`).update({ status, updatedAt: now });
    const subject = `Your Auronix supplier submission is ${status.replace(/_/g, ' ')}`; const log = adminDb.ref('emailDeliveryLogs').push(); await log.set({ id: log.key, recipient: supplier.email, subject, event: 'supplier-status', status: 'queued', createdAt: now, updatedAt: now });
    let emailSent = false; try { const info: any = await sendProfessionalEmail({ to: supplier.email, name: supplier.contactName, subject, body: `The status of ${supplier.companyName || 'your supplier submission'} changed from ${previousStatus || 'submitted'} to ${status.replace(/_/g, ' ')}.\n\nSupplier reference: ${supplierId}` }, 'notification'); await log.update({ status: 'sent', providerMessageId: clean(info?.messageId, 500), updatedAt: Date.now() }); emailSent = true; } catch (mailError) { await log.update({ status: 'failed', error: userFacingError(mailError, 'Delivery failed.'), updatedAt: Date.now() }); }
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'SUPPLIER_STATUS_CHANGED', targetType: 'supplier', targetId: supplierId, summary: `${previousStatus || 'submitted'} → ${status}`, request });
    return NextResponse.json({ success: true, emailSent });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to update supplier status.') }, { status: 401 }); }
}
