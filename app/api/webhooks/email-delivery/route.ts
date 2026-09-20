import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { normalizeNewsletterEmail } from '@/lib/server-newsletter';
import { reportOperationalError } from '@/lib/server-audit';

export const runtime = 'nodejs';
const supported = new Set(['sent', 'delivered', 'deferred', 'failed', 'bounced', 'complained', 'opened', 'clicked']);
const safeEqual = (a: string, b: string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); };

export async function POST(request: Request) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'Email delivery webhook is not configured.' }, { status: 503 });
  const raw = await request.text();
  const supplied = (request.headers.get('x-auronix-signature') || request.headers.get('x-webhook-signature') || '').replace(/^sha256=/, '');
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  if (!supplied || !safeEqual(supplied, expected)) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  try {
    const payload = JSON.parse(raw);
    const events = Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [payload];
    let accepted = 0;
    for (const item of events.slice(0, 100)) {
      const type = String(item?.event || item?.type || item?.status || '').toLowerCase();
      if (!supported.has(type)) continue;
      const email = normalizeNewsletterEmail(String(item?.email || item?.recipient || ''));
      const messageId = String(item?.messageId || item?.message_id || item?.id || '').slice(0, 500);
      const now = Number(item?.timestamp || 0) || Date.now();
      const eventRef = adminDb.ref('newsletterDeliveryEvents').push();
      await eventRef.set({ id: eventRef.key, type, email, messageId, provider: String(item?.provider || request.headers.get('x-email-provider') || 'smtp'), rawEventId: String(item?.eventId || item?.event_id || ''), createdAt: now, receivedAt: Date.now() });
      if (messageId) {
        const deliveries = (await adminDb.ref('emailDeliveryLogs').get()).val() || {};
        const match = Object.entries(deliveries as Record<string, any>).find(([, record]) => String(record?.providerMessageId || '') === messageId);
        if (match) await adminDb.ref(`emailDeliveryLogs/${match[0]}`).update({ status: type === 'deferred' ? 'sent' : type, updatedAt: Date.now() });
      }
      if (email && (type === 'bounced' || type === 'complained')) {
        const subscribers = (await adminDb.ref('newsletterSubscribers').get()).val() || {};
        const match = Object.entries(subscribers as Record<string, any>).find(([, record]) => normalizeNewsletterEmail(String(record?.email || '')) === email);
        if (match) await adminDb.ref(`newsletterSubscribers/${match[0]}`).update({ active: false, suppressed: true, suppressionReason: type, suppressedAt: Date.now(), updatedAt: Date.now() });
      }
      accepted += 1;
    }
    return NextResponse.json({ success: true, accepted });
  } catch (error) {
    await reportOperationalError('email-delivery-webhook', error);
    return NextResponse.json({ error: 'Invalid delivery event payload.' }, { status: 400 });
  }
}
