import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { maskPhone } from '@/lib/seller-whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const verificationId = String(searchParams.get('verificationId') || '').trim();

    if (!verificationId) {
      return NextResponse.json(
        { success: false, error: 'Verification ID is required.' },
        { status: 400 }
      );
    }

    const ref = adminDb.ref(`sellerWhatsappVerifications/${verificationId}`);
    const snapshot = await ref.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, error: 'Verification request was not found.' },
        { status: 404 }
      );
    }

    const value = snapshot.val();
    const now = Date.now();
    let status = String(value?.status || 'pending');

    if (status === 'pending' && Number(value?.expiresAt || 0) <= now) {
      status = 'expired';
      await ref.update({ status: 'expired', updatedAt: now, codeHash: null });
    }

    return NextResponse.json({
      success: true,
      verificationId,
      status,
      verified: status === 'verified',
      maskedPhone: maskPhone(String(value?.phone || '')),
      expiresAt: Number(value?.expiresAt || 0),
      attempts: Number(value?.attempts || 0),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to check verification status.',
      },
      { status: 500 }
    );
  }
}
