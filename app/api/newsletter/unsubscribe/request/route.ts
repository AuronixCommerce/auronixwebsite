import { userFacingError } from '@/lib/user-facing-error';
import { createHash, randomBytes, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isValidNewsletterEmail, normalizeNewsletterEmail } from '@/lib/server-newsletter';
import { sendNewsletterUnsubscribeEmail } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export const runtime = 'nodejs';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://auronixcommerce.com').replace(/\/+$/, '');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'newsletter-unsubscribe-request', body, { limit: 5, windowMs: 30 * 60_000 });
    const email = normalizeNewsletterEmail(String(body?.email || ''));
    if (!isValidNewsletterEmail(email)) return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });

    const snapshot = await adminDb.ref('newsletterSubscribers').get();
    const records = snapshot.exists() ? snapshot.val() as Record<string, any> : {};
    const match = Object.entries(records).find(([, record]) => normalizeNewsletterEmail(String(record?.email || '')) === email && record?.active === true);

    // Always return the same result so this endpoint cannot be used to discover subscribers.
    if (!match) return NextResponse.json({ success: true, message: 'If this address is subscribed, a confirmation email has been sent.' });

    const emailHash = hash(email);
    const requestRef = adminDb.ref(`newsletterUnsubscribeRequests/${emailHash}`);
    const previous = (await requestRef.get()).val() || {};
    if (Date.now() - Number(previous.sentAt || 0) < 60_000) {
      return NextResponse.json({ success: true, message: 'If this address is subscribed, a confirmation email has been sent.' });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hash(token);
    const code = String(randomInt(100000, 1000000));
    const expiresAt = Date.now() + 30 * 60_000;
    await Promise.all([
      requestRef.set({ email, subscriberId: match[0], tokenHash, codeHash: hash(`${email}:${code}`), expiresAt, attempts: 0, sentAt: 0, createdAt: Date.now(), status: 'pending' }),
      adminDb.ref(`newsletterUnsubscribeTokenIndex/${tokenHash}`).set({ emailHash, expiresAt }),
    ]);

    await sendNewsletterUnsubscribeEmail({ email, code, expiresAt, unsubscribeUrl: `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}` });
    await requestRef.update({ sentAt: Date.now(), updatedAt: Date.now() });
    return NextResponse.json({ success: true, message: 'If this address is subscribed, a confirmation email has been sent.' });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Newsletter unsubscribe request failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Unable to send the confirmation email right now. Please retry.' }, { status: 500 });
  }
}
