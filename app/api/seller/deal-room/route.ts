import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireSeller } from '@/lib/server-auth';
import { appendDealRoomTimeline, ensureDealRoom, normalizeCommercial, roomForClient } from '@/lib/deal-room';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
const clean = (value: unknown, max = 3000) => String(value ?? '').trim().slice(0, max);
const jsonError = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function sellerContext(request: Request) {
  const decoded = await requireSeller(request);
  const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  const profile = profileSnapshot.val();
  const applicationId = clean(profile?.sellerApplicationId, 160);
  if (!profile || !applicationId) throw new Error('Your approved application is not connected to this workspace.');
  const applicationSnapshot = await adminDb.ref(`sellerApplications/${applicationId}`).get();
  if (!applicationSnapshot.exists()) throw new Error('Your partner record could not be found.');
  return { uid: decoded.uid, profile, applicationId, application: applicationSnapshot.val() };
}

export async function GET(request: Request) {
  try {
    const { applicationId, application } = await sellerContext(request);
    const room = await ensureDealRoom(applicationId, application);
    return NextResponse.json({ success: true, room: roomForClient(room), application: { id: applicationId, status: application.status, revision: application.revision || 0 } });
  } catch (error) {
    return jsonError(userFacingError(error, 'Unable to open the Deal Room.'), 401);
  }
}

export async function POST(request: Request) {
  try {
    const { uid, profile, applicationId, application } = await sellerContext(request);
    const body = await request.json();
    if (body.action !== 'message') return jsonError('Unsupported Deal Room action.');
    const message = clean(body.message, 5000);
    if (message.length < 2) return jsonError('Write a message before sending.');
    await ensureDealRoom(applicationId, application);
    const messageRef = adminDb.ref(`partnerDealRooms/${applicationId}/messages`).push();
    const item = { id: messageRef.key, body: message, senderRole: 'seller', senderUid: uid, senderEmail: clean(profile.email, 320), createdAt: Date.now() };
    await messageRef.set(item);
    await appendDealRoomTimeline(applicationId, { type: 'message', title: 'Partner message sent', description: message.slice(0, 240), actorRole: 'seller', actorEmail: clean(profile.email, 320) });
    return NextResponse.json({ success: true, message: item }, { status: 201 });
  } catch (error) {
    return jsonError(userFacingError(error, 'Unable to send this message.'), 401);
  }
}

export async function PATCH(request: Request) {
  try {
    const { applicationId, application } = await sellerContext(request);
    const body = await request.json();
    await ensureDealRoom(applicationId, application);
    if (body.action === 'commercial') {
      const commercial = normalizeCommercial(body.commercial);
      if (commercial.leadTimeDays && (!/^\d{1,4}$/.test(commercial.leadTimeDays) || Number(commercial.leadTimeDays) > 1000)) return jsonError('Lead time must be a number between 0 and 1000 days.');
      await adminDb.ref(`partnerDealRooms/${applicationId}`).update({ commercial, updatedAt: Date.now() });
      await appendDealRoomTimeline(applicationId, { type: 'commercial', title: 'Commercial terms updated', description: 'MOQ, pricing, lead time, brand, and fulfillment information were updated.', actorRole: 'seller' });
      return NextResponse.json({ success: true, commercial });
    }
    if (body.action === 'preferences') {
      const whatsapp = body.whatsapp === true;
      const phone = clean(body.whatsappPhone, 30);
      if (whatsapp && phone.replace(/\D/g, '').length < 8) return jsonError('Enter a valid international phone number before enabling WhatsApp status updates.');
      const preferences = { email: body.email !== false, push: body.push === true, whatsapp, whatsappPhone: phone };
      await adminDb.ref(`partnerDealRooms/${applicationId}`).update({ notificationPreferences: preferences, updatedAt: Date.now() });
      return NextResponse.json({ success: true, notificationPreferences: preferences });
    }
    return jsonError('Unsupported Deal Room action.');
  } catch (error) {
    return jsonError(userFacingError(error, 'Unable to update the Deal Room.'), 401);
  }
}
