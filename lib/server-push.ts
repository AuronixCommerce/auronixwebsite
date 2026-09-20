import webpush from 'web-push';
import { adminDb } from '@/lib/firebase-admin';

let configured = false;

function configure() {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT || 'mailto:business@auronixcommerce.com';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendSellerPush(uid: string, payload: { title: string; body: string; href?: string }) {
  if (!uid || !configure()) return { sent: 0, unavailable: true };
  const snapshot = await adminDb.ref(`pushSubscriptions/${uid}`).get();
  if (!snapshot.exists()) return { sent: 0 };
  const subscriptions = snapshot.val() as Record<string, webpush.PushSubscription>;
  let sent = 0;
  await Promise.all(Object.entries(subscriptions).map(async ([id, subscription]) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent += 1;
      await adminDb.ref(`pushSubscriptions/${uid}/${id}`).update({ lastUsedAt: Date.now() });
    } catch (error: any) {
      if ([404, 410].includes(Number(error?.statusCode))) await adminDb.ref(`pushSubscriptions/${uid}/${id}`).remove();
    }
  }));
  return { sent };
}
