import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import {
  normalizePhone,
  OTP_MAX_ATTEMPTS,
  safeKey,
  verifyOtpHash,
} from '@/lib/seller-whatsapp';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const secret = process.env.AURONIX_VERIFY_SECRET?.trim();
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const senderPhone = normalizePhone(body?.from);
    const messageId = String(body?.messageId || '').trim();
    const messageBody = String(body?.body || '').trim();
    const match = /^VERIFY\s+AURONIX\s+(\d{6})$/i.exec(messageBody);

    if (!messageId || !match) {
      return NextResponse.json({ success: true, handled: false, reply: null });
    }

    const processedKey = safeKey(messageId);
    const processedRef = adminDb.ref(`whatsappProcessedMessages/${processedKey}`);
    const processedSnapshot = await processedRef.get();

    if (processedSnapshot.exists()) {
      return NextResponse.json({ success: true, handled: true, duplicate: true, reply: null });
    }

    await processedRef.set({
      messageId,
      from: senderPhone,
      receivedAt: Date.now(),
    });

    const indexSnapshot = await adminDb
      .ref(`sellerWhatsappVerificationByPhone/${senderPhone}`)
      .get();

    if (!indexSnapshot.exists()) {
      return NextResponse.json({
        success: true,
        handled: true,
        reply: 'Auronix Commerce could not find an active verification request for this WhatsApp number. Please return to the seller application and request a new code.',
      });
    }

    const ids = Object.entries(indexSnapshot.val() || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([id]) => id);

    const code = match[1];
    const now = Date.now();

    for (const verificationId of ids) {
      const verificationRef = adminDb.ref(`sellerWhatsappVerifications/${verificationId}`);
      const snapshot = await verificationRef.get();
      if (!snapshot.exists()) continue;

      const value = snapshot.val();
      const status = String(value?.status || '');

      if (status === 'verified') {
        return NextResponse.json({
          success: true,
          handled: true,
          verified: true,
          reply: 'Your WhatsApp number is already verified for your Auronix Commerce seller application.',
        });
      }

      if (status !== 'pending') continue;

      if (Number(value?.expiresAt || 0) <= now) {
        await verificationRef.update({ status: 'expired', codeHash: null, updatedAt: now });
        continue;
      }

      const attempts = Number(value?.attempts || 0);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await verificationRef.update({ status: 'failed', codeHash: null, updatedAt: now });
        continue;
      }

      const valid = verifyOtpHash(
        verificationId,
        senderPhone,
        code,
        String(value?.codeHash || '')
      );

      if (!valid) {
        const nextAttempts = attempts + 1;
        await verificationRef.update({
          attempts: nextAttempts,
          status: nextAttempts >= OTP_MAX_ATTEMPTS ? 'failed' : 'pending',
          codeHash: nextAttempts >= OTP_MAX_ATTEMPTS ? null : value.codeHash,
          lastMessageId: messageId,
          updatedAt: now,
        });

        return NextResponse.json({
          success: true,
          handled: true,
          verified: false,
          reply: nextAttempts >= OTP_MAX_ATTEMPTS
            ? 'Auronix Commerce could not verify that code. The verification request has been locked. Please return to the seller application and request a new code.'
            : 'Auronix Commerce could not verify that code. Please check the code shown on the seller application and try again.',
        });
      }

      await verificationRef.update({
        status: 'verified',
        verifiedAt: now,
        messageId,
        codeHash: null,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        handled: true,
        verified: true,
        verificationId,
        reply: 'Auronix Commerce verification successful. Your WhatsApp number has been verified. You may now return to the seller application and submit it.',
      });
    }

    return NextResponse.json({
      success: true,
      handled: true,
      verified: false,
      reply: 'This Auronix Commerce verification code has expired or is no longer active. Please return to the seller application and request a new code.',
    });
  } catch (error) {
    console.error('Seller WhatsApp inbound verification failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to process WhatsApp verification.' },
      { status: 500 }
    );
  }
}
