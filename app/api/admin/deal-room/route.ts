import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { appendDealRoomTimeline, ensureDealRoom, normalizeCommercial, roomForClient } from '@/lib/deal-room';
import { notifyPartner } from '@/lib/server-partner-notifications';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
const clean = (value: unknown, max = 5000) => String(value ?? '').trim().slice(0, max);
const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const entries = (value: any) => Object.entries(value || {}).map(([id, item]) => ({ ...(item as object), id }));

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const applicationId = clean(new URL(request.url).searchParams.get('applicationId'), 160);
    if (applicationId) {
      const [appSnapshot, historySnapshot] = await Promise.all([adminDb.ref(`sellerApplications/${applicationId}`).get(), adminDb.ref(`sellerApplicationHistories/${applicationId}`).get()]);
      if (!appSnapshot.exists()) return error('Application not found.', 404);
      const room = await ensureDealRoom(applicationId, appSnapshot.val());
      const history = entries(historySnapshot.val()).sort((a: any, b: any) => Number(b.revision || 0) - Number(a.revision || 0));
      return NextResponse.json({ success: true, room: roomForClient(room), application: { ...appSnapshot.val(), id: applicationId }, history });
    }
    const [roomsSnapshot, applicationsSnapshot] = await Promise.all([adminDb.ref('partnerDealRooms').get(), adminDb.ref('sellerApplications').get()]);
    const applications = applicationsSnapshot.val() || {};
    const rooms = entries(roomsSnapshot.val()).map((room: any) => roomForClient(room));
    const existing = new Set(rooms.map((room: any) => room.applicationId));
    const pending = Object.entries(applications).filter(([id]) => !existing.has(id)).map(([id, app]: any) => ({ applicationId: id, companyName: app.businessName || app.companyName || '', contactName: app.fullName || '', contactEmail: app.preferredContactEmail || app.businessEmail || app.email || '', status: app.status || 'pending', updatedAt: app.updatedAt || app.createdAt, documents: [], messages: [], timeline: [], commercial: normalizeCommercial(app.commercial), notificationPreferences: { email: true, push: false, whatsapp: false, whatsappPhone: '' } }));
    return NextResponse.json({ success: true, rooms: [...rooms, ...pending].sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)) });
  } catch (caught) {
    return error(userFacingError(caught, 'Unable to load Deal Rooms.'), 401);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const applicationId = clean(body.applicationId, 160);
    if (!/^[a-zA-Z0-9_-]{8,160}$/.test(applicationId)) return error('Select a valid application.');
    const applicationSnapshot = await adminDb.ref(`sellerApplications/${applicationId}`).get();
    if (!applicationSnapshot.exists()) return error('Application not found.', 404);
    await ensureDealRoom(applicationId, applicationSnapshot.val());
    if (body.action === 'message') {
      const message = clean(body.message, 5000);
      if (message.length < 2) return error('Write a message before sending.');
      const ref = adminDb.ref(`partnerDealRooms/${applicationId}/messages`).push();
      const item = { id: ref.key, body: message, senderRole: 'admin', senderUid: admin.uid, senderEmail: clean(admin.email, 320), createdAt: Date.now() };
      await ref.set(item);
      await appendDealRoomTimeline(applicationId, { type: 'message', title: 'Auronix message sent', description: message.slice(0, 240), actorRole: 'admin', actorEmail: clean(admin.email, 320) });
      const delivery = await notifyPartner({ applicationId, title: 'New message in your Auronix Deal Room', body: message, event: 'deal-room-message' });
      await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'DEAL_ROOM_MESSAGE', targetType: 'sellerApplication', targetId: applicationId, summary: message.slice(0, 300), request });
      return NextResponse.json({ success: true, message: item, ...delivery }, { status: 201 });
    }
    return error('Unsupported Deal Room action.');
  } catch (caught) {
    return error(userFacingError(caught, 'Unable to update this Deal Room.'), 401);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const applicationId = clean(body.applicationId, 160);
    if (!/^[a-zA-Z0-9_-]{8,160}$/.test(applicationId)) return error('Select a valid application.');
    if (body.action === 'document-review') {
      const documentId = clean(body.documentId, 160);
      const status = clean(body.status, 30);
      const note = clean(body.note, 2000);
      if (!['approved', 'rejected', 'expired', 'archived'].includes(status)) return error('Choose a valid document decision.');
      const documentRef = adminDb.ref(`partnerDealRooms/${applicationId}/documents/${documentId}`);
      const snapshot = await documentRef.get();
      if (!snapshot.exists()) return error('Document not found.', 404);
      await documentRef.update({ status, reviewNote: note, reviewedAt: Date.now(), reviewedBy: admin.uid });
      await appendDealRoomTimeline(applicationId, { type: 'document', title: `Document ${status}`, description: `${snapshot.val().name}${note ? ` — ${note}` : ''}`, actorRole: 'admin', actorEmail: clean(admin.email, 320) });
      const delivery = await notifyPartner({ applicationId, title: `Document ${status}`, body: `${snapshot.val().name} was marked ${status}.${note ? `\n\nReview note: ${note}` : ''}`, event: 'document-status' });
      await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'DOCUMENT_REVIEW', targetType: 'partnerDocument', targetId: documentId, summary: `${status}: ${snapshot.val().name}`, metadata: { applicationId }, request });
      return NextResponse.json({ success: true, ...delivery });
    }
    if (body.action === 'commercial') {
      const commercial = normalizeCommercial(body.commercial);
      await adminDb.ref(`partnerDealRooms/${applicationId}`).update({ commercial, updatedAt: Date.now() });
      await appendDealRoomTimeline(applicationId, { type: 'commercial', title: 'Commercial review updated', description: 'Auronix updated the reviewed commercial terms.', actorRole: 'admin', actorEmail: clean(admin.email, 320) });
      return NextResponse.json({ success: true, commercial });
    }
    return error('Unsupported Deal Room action.');
  } catch (caught) {
    return error(userFacingError(caught, 'Unable to update this Deal Room.'), 401);
  }
}
