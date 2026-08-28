import { randomInt } from 'crypto';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import {
  AURONIX_WHATSAPP_NUMBER,
  hashOtp,
  maskPhone,
  normalizePhone,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_WINDOW,
  OTP_REQUEST_WINDOW_MS,
  OTP_TTL_MS,
  whatsappMessage,
  whatsappUrl,
} from '@/lib/seller-whatsapp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body?.phone);
    const now = Date.now();

    const rateRef = adminDb.ref(`sellerWhatsappRate/${phone}`);
    const rateSnapshot = await rateRef.get();
    const previous = rateSnapshot.exists() ? rateSnapshot.val() : {};
    const windowStartedAt = Number(previous?.windowStartedAt || 0);
    const withinWindow = now - windowStartedAt < OTP_REQUEST_WINDOW_MS;
    const requestCount = withinWindow ? Number(previous?.requestCount || 0) : 0;

    if (requestCount >= OTP_MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { success: false, error: 'Too many verification requests. Please try again later.' },
        { status: 429 }
      );
    }

    const verificationRef = adminDb.ref('sellerWhatsappVerifications').push();
    const verificationId = verificationRef.key;

    if (!verificationId) {
      throw new Error('Unable to create verification request.');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = now + OTP_TTL_MS;

    await Promise.all([
      verificationRef.set({
        id: verificationId,
        phone,
        codeHash: hashOtp(verificationId, phone, code),
        status: 'pending',
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        requestedAt: now,
        expiresAt,
        verifiedAt: null,
        messageId: null,
        consumedAt: null,
        updatedAt: now,
      }),
      adminDb.ref(`sellerWhatsappVerificationByPhone/${phone}/${verificationId}`).set(now),
      rateRef.set({
        windowStartedAt: withinWindow ? windowStartedAt : now,
        requestCount: requestCount + 1,
        updatedAt: now,
      }),
    ]);

    return NextResponse.json({
      success: true,
      verificationId,
      status: 'pending',
      maskedPhone: maskPhone(phone),
      expiresAt,
      whatsappNumber: `+${AURONIX_WHATSAPP_NUMBER}`,
      verificationCode: code,
      messageText: whatsappMessage(code),
      whatsappUrl: whatsappUrl(code),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to start WhatsApp verification.',
      },
      { status: 400 }
    );
  }
}
