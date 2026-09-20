import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireSeller } from '@/lib/server-auth';
import { ensureDealRoom } from '@/lib/deal-room';
import { sendSellerPush } from '@/lib/server-push';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
const idFor = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex').slice(0, 40);

async function context(request: Request) {
  const seller = await requireSeller(request); const profileSnapshot = await adminDb.ref(`users/${seller.uid}`).get(); const profile = profileSnapshot.val();
  return { seller, profile, applicationId: String(profile?.sellerApplicationId || '') };
}
export async function GET(request: Request) {
  try { const { seller } = await context(request); const snapshot = await adminDb.ref(`pushSubscriptions/${seller.uid}`).get(); return NextResponse.json({ success: true, configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '', subscribed: snapshot.exists(), subscriptions: snapshot.numChildren() }); }
  catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to load notification settings.') }, { status: 401 }); }
}
export async function POST(request: Request) {
  try {
    const { seller, applicationId } = await context(request); const body = await request.json();
    if (body.action === 'subscribe') {
      const subscription = body.subscription; const endpoint = String(subscription?.endpoint || '');
      if (!endpoint.startsWith('https://') || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return NextResponse.json({ error: 'The browser notification subscription is invalid.' }, { status: 400 });
      await adminDb.ref(`pushSubscriptions/${seller.uid}/${idFor(endpoint)}`).set({ ...subscription, createdAt: Date.now(), userAgent: String(request.headers.get('user-agent') || '').slice(0, 500) });
      if (applicationId) { await ensureDealRoom(applicationId); await adminDb.ref(`partnerDealRooms/${applicationId}/notificationPreferences`).update({ push: true }); }
      await sendSellerPush(seller.uid, { title: 'Auronix notifications enabled', body: 'Important Deal Room and application updates can now reach this device.', href: '/seller/settings' }).catch(() => undefined);
      return NextResponse.json({ success: true });
    }
    if (body.action === 'unsubscribe') {
      const endpoint = String(body.endpoint || ''); if (endpoint) await adminDb.ref(`pushSubscriptions/${seller.uid}/${idFor(endpoint)}`).remove(); else await adminDb.ref(`pushSubscriptions/${seller.uid}`).remove();
      if (applicationId) await adminDb.ref(`partnerDealRooms/${applicationId}/notificationPreferences`).update({ push: false });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Unsupported notification action.' }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to update notifications.') }, { status: 401 }); }
}
