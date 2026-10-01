import webpush from 'web-push';
import { adminDb } from '@/lib/firebase-admin';

let configured = false;
type PushPayload = { title: string; body: string; href?: string; category?: 'account' | 'products' | 'catalogs' | 'support' | 'security' | 'marketing' };

function configureWebPush() {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT || 'mailto:business@auronixcommerce.com';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function categoryFor(payload: PushPayload): PushPayload['category'] {
  if (payload.category) return payload.category;
  const value = `${payload.href || ''} ${payload.title || ''}`.toLowerCase();
  if (value.includes('support') || value.includes('ticket')) return 'support';
  if (value.includes('catalog')) return 'catalogs';
  if (value.includes('product') || value.includes('inventory') || value.includes('listing')) return 'products';
  if (value.includes('security') || value.includes('login') || value.includes('session')) return 'security';
  return 'account';
}

async function pushAllowed(uid: string, payload: PushPayload) {
  const snapshot = await adminDb.ref(`sellerNotificationPreferences/${uid}`).get();
  if (!snapshot.exists()) return true;
  const category = categoryFor(payload) || 'account';
  const value = snapshot.val()?.[category];
  return value !== false;
}

async function sendWebPush(uid: string, payload: PushPayload) {
  if (!configureWebPush()) return 0;
  const snapshot = await adminDb.ref(`pushSubscriptions/${uid}`).get();
  if (!snapshot.exists()) return 0;
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
  return sent;
}

async function sendMobilePush(uid: string, payload: PushPayload) {
  const snapshot = await adminDb.ref(`sellerMobilePush/${uid}`).get();
  if (!snapshot.exists()) return 0;
  const records = Object.entries(snapshot.val() as Record<string, { token?: string }>).filter(([, value]) => typeof value?.token === 'string' && value.token);
  if (!records.length) return 0;

  const messages = records.map(([, value]) => ({
    to: value.token as string,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: { href: payload.href || '/(tabs)/notifications' },
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!response.ok) return 0;
    const json = await response.json().catch(() => ({})) as { data?: Array<{ status?: string; details?: { error?: string } }> };
    let sent = 0;
    await Promise.all(records.map(async ([id], index) => {
      const receipt = json.data?.[index];
      if (receipt?.status === 'ok') {
        sent += 1;
        await adminDb.ref(`sellerMobilePush/${uid}/${id}`).update({ lastUsedAt: Date.now() });
        return;
      }
      if (receipt?.details?.error === 'DeviceNotRegistered') await adminDb.ref(`sellerMobilePush/${uid}/${id}`).remove();
    }));
    return sent;
  } catch (error) {
    console.error('Seller mobile push failed:', error);
    return 0;
  }
}

export async function sendSellerPush(uid: string, payload: PushPayload) {
  if (!uid) return { sent: 0, webSent: 0, mobileSent: 0, blocked: false };
  if (!(await pushAllowed(uid, payload))) return { sent: 0, webSent: 0, mobileSent: 0, blocked: true };
  const [webSent, mobileSent] = await Promise.all([sendWebPush(uid, payload), sendMobilePush(uid, payload)]);
  return { sent: webSent + mobileSent, webSent, mobileSent, blocked: false };
}
