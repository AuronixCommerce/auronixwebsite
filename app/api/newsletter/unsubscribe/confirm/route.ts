import { userFacingError } from '@/lib/user-facing-error';
import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isValidNewsletterEmail, normalizeNewsletterEmail } from '@/lib/server-newsletter';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export const runtime = 'nodejs';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const same = (left: string, right: string) => { try { const a = Buffer.from(left, 'hex'); const b = Buffer.from(right, 'hex'); return a.length === b.length && timingSafeEqual(a, b); } catch { return false; } };
const allowedReasons = new Set(['too_many_emails', 'not_relevant', 'never_signed_up', 'content_quality', 'privacy_concerns', 'other', 'prefer_not_to_say']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'newsletter-unsubscribe-confirm', body, { limit: 12, windowMs: 30 * 60_000 });
    const token = String(body?.token || '').trim();
    const email = normalizeNewsletterEmail(String(body?.email || ''));
    const code = String(body?.code || '').replace(/\D/g, '').slice(0, 6);
    const reason = String(body?.reason || 'prefer_not_to_say');
    const otherReason = String(body?.otherReason || '').trim().slice(0, 1000);
    if (!allowedReasons.has(reason)) return NextResponse.json({ success: false, error: 'Select a valid unsubscribe reason.', field: 'reason' }, { status: 400 });
    if (reason === 'other' && otherReason.length < 3) return NextResponse.json({ success: false, error: 'Please briefly describe your reason.', field: 'otherReason' }, { status: 400 });

    let subscriberId = '';
    let requestRef: ReturnType<typeof adminDb.ref> | null = null;
    let requestData: any = null;
    let method: 'link' | 'code' = token ? 'link' : 'code';

    if (token) {
      const tokenHash = hash(token);
      const index = (await adminDb.ref(`newsletterUnsubscribeTokenIndex/${tokenHash}`).get()).val();
      if (index?.emailHash) {
        requestRef = adminDb.ref(`newsletterUnsubscribeRequests/${index.emailHash}`);
        requestData = (await requestRef.get()).val();
        if (!requestData || !same(String(requestData.tokenHash || ''), tokenHash)) requestData = null;
      } else {
        // Existing campaign emails contain the subscriber's long-lived unsubscribe token.
        const subscribers = (await adminDb.ref('newsletterSubscribers').get()).val() || {};
        const legacy = Object.entries(subscribers as Record<string, any>).find(([, record]) => same(hash(String(record?.unsubscribeToken || '')), hash(token)));
        if (legacy) subscriberId = legacy[0];
      }
    } else {
      if (!isValidNewsletterEmail(email) || code.length !== 6) return NextResponse.json({ success: false, error: 'Enter the email address and six-digit code from the message.' }, { status: 400 });
      requestRef = adminDb.ref(`newsletterUnsubscribeRequests/${hash(email)}`);
      requestData = (await requestRef.get()).val();
      if (requestData && !same(String(requestData.codeHash || ''), hash(`${email}:${code}`))) {
        await requestRef.update({ attempts: Number(requestData.attempts || 0) + 1, updatedAt: Date.now() });
        return NextResponse.json({ success: false, error: 'That confirmation code is incorrect.' }, { status: 400 });
      }
    }

    if (requestData) {
      if (requestData.status === 'completed') return NextResponse.json({ success: true, alreadyUnsubscribed: true });
      if (Number(requestData.expiresAt || 0) <= Date.now()) return NextResponse.json({ success: false, error: 'This unsubscribe confirmation has expired. Request a new email.', code: 'EXPIRED' }, { status: 410 });
      if (Number(requestData.attempts || 0) >= 5) return NextResponse.json({ success: false, error: 'Too many incorrect attempts. Request a new confirmation email.', code: 'TOO_MANY_ATTEMPTS' }, { status: 429 });
      subscriberId = String(requestData.subscriberId || '');
    }
    if (!subscriberId) return NextResponse.json({ success: false, error: 'This unsubscribe link or code is invalid.' }, { status: 404 });

    const subscriberRef = adminDb.ref(`newsletterSubscribers/${subscriberId}`);
    const subscriber = (await subscriberRef.get()).val();
    if (!subscriber) return NextResponse.json({ success: false, error: 'This newsletter subscription could not be found.' }, { status: 404 });
    const now = Date.now();
    const reasonRef = adminDb.ref('newsletterUnsubscribeReasons').push();
    await Promise.all([
      subscriberRef.update({ active: false, unsubscribedAt: now, unsubscribeReason: reason, updatedAt: now }),
      reasonRef.set({ id: reasonRef.key, subscriberId, email: normalizeNewsletterEmail(String(subscriber.email || requestData?.email || '')), reason, otherReason: reason === 'other' ? otherReason : '', method, createdAt: now }),
      requestRef ? requestRef.update({ status: 'completed', completedAt: now, updatedAt: now }) : Promise.resolve(),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Newsletter unsubscribe confirmation failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Unable to update your newsletter preference right now.' }, { status: 500 });
  }
}
