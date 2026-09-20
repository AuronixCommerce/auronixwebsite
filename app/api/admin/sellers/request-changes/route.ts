import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { notifySellerApplication } from '@/lib/seller-tracking';
import { appendDealRoomTimeline, ensureDealRoom } from '@/lib/deal-room';
import { writeAuditLog } from '@/lib/server-audit';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const id = String(body.applicationId || '');
    const message = String(body.message || '').trim().slice(0, 3000);
    const requestedFields = Array.isArray(body.requestedFields) ? body.requestedFields.map((field: unknown) => String(field).trim()).filter((field: string) => field && field.length <= 80).slice(0, 20) : [];
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || message.length < 10) return NextResponse.json({ error: 'Select an application and describe the corrections needed.' }, { status: 400 });
    const result = await adminDb.ref(`sellerApplications/${id}`).transaction(current => {
      if (!current || !['pending','under_review','screening','changes_requested'].includes(current.status || 'pending')) return;
      return { ...current, status: 'changes_requested', reviewMessage: message, requestedFields, changesRequestedAt: Date.now(), changesRequestedBy: admin.uid, updatedAt: Date.now() };
    });
    if (!result.committed) return NextResponse.json({ error: 'This application cannot receive a correction request at its current stage.' }, { status: 409 });
    await ensureDealRoom(id, result.snapshot.val());
    await appendDealRoomTimeline(id, { type: 'change-request', title: 'Application changes requested', description: message, actorRole: 'admin', actorEmail: admin.email || '', requestedFields });
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'APPLICATION_CHANGES_REQUESTED', targetType: 'sellerApplication', targetId: id, summary: message, metadata: { requestedFields }, request });
    const emailSent = await notifySellerApplication(id, result.snapshot.val(), 'Action needed: your Auronix seller application', `The review team needs you to update your application:\n\n${message}\n\nOpen application tracking and choose Edit application to submit your corrections.`);
    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error('Application correction request failed', error);
    return NextResponse.json({ error: 'Unable to request corrections. Check your admin session and try again.' }, { status: 500 });
  }
}
