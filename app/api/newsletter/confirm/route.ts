import { userFacingError } from '@/lib/user-facing-error';
import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'newsletter-confirm', body, { limit: 12, windowMs: 15 * 60_000 });
    const token = String(body?.token || '').trim();
    if (token.length < 40) return NextResponse.json({ success: false, error: 'This confirmation link is invalid.' }, { status: 400 });
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const indexRef = adminDb.ref(`newsletterConfirmationIndex/${tokenHash}`);
    const index = (await indexRef.get()).val();
    if (!index?.subscriberId) return NextResponse.json({ success: false, error: 'This confirmation link is invalid or has already been used.' }, { status: 404 });
    if (Number(index.expiresAt || 0) <= Date.now()) return NextResponse.json({ success: false, error: 'This confirmation link has expired. Subscribe again to receive a new one.' }, { status: 410 });
    const subscriberRef = adminDb.ref(`newsletterSubscribers/${index.subscriberId}`);
    const subscriber = (await subscriberRef.get()).val();
    const stored = Buffer.from(String(subscriber?.confirmationTokenHash || ''), 'hex');
    const supplied = Buffer.from(tokenHash, 'hex');
    if (!subscriber || stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) return NextResponse.json({ success: false, error: 'This confirmation link is invalid.' }, { status: 404 });
    const now = Date.now();
    await Promise.all([
      subscriberRef.update({ active: true, suppressed: false, pendingConfirmation: false, confirmationTokenHash: null, confirmationExpiresAt: null, confirmedAt: now, subscribedAt: Number(subscriber.subscribedAt || now), resubscribedAt: subscriber.unsubscribedAt ? now : null, updatedAt: now }),
      indexRef.remove(),
      adminDb.ref('newsletterEvents').push().set({ type: 'confirmed', subscriberId: index.subscriberId, createdAt: now }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error);
    if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Newsletter confirmation failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Unable to confirm your subscription right now.' }, { status: 500 });
  }
}
