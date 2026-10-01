import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cleanText, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

function tokenId(token: string) {
  return createHash('sha256').update(token).digest('hex').slice(0, 40);
}

function validExpoToken(token: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const token = cleanText(body.token, 500);
    if (!validExpoToken(token)) return NextResponse.json({ error: 'A valid mobile push token is required.' }, { status: 400 });
    const id = tokenId(token);
    const now = Date.now();
    const ref = adminDb.ref(`sellerMobilePush/${uid}/${id}`);
    const previous = await ref.get();
    await ref.set({
      token,
      platform: cleanText(body.platform, 40),
      appVersion: cleanText(body.appVersion, 40),
      installationId: cleanText(body.installationId, 160),
      createdAt: Number(previous.val()?.createdAt || now),
      updatedAt: now,
      lastUsedAt: now,
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to register mobile notifications.') }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const token = cleanText(new URL(request.url).searchParams.get('token'), 500);
    if (!validExpoToken(token)) return NextResponse.json({ error: 'A valid mobile push token is required.' }, { status: 400 });
    await adminDb.ref(`sellerMobilePush/${uid}/${tokenId(token)}`).remove();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to unregister mobile notifications.') }, { status: 500 });
  }
}
