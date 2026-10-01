import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

const defaults = {
  account: true,
  products: true,
  catalogs: true,
  support: true,
  security: true,
  marketing: false,
};

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const snapshot = await adminDb.ref(`sellerNotificationPreferences/${uid}`).get();
    return NextResponse.json({ preferences: { ...defaults, ...(snapshot.val() || {}) } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load notification preferences.') }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const updates: Record<string, boolean | number> = { updatedAt: Date.now() };
    for (const key of Object.keys(defaults)) {
      if (typeof body?.[key] === 'boolean') updates[key] = body[key];
    }
    await adminDb.ref(`sellerNotificationPreferences/${uid}`).update(updates);
    const snapshot = await adminDb.ref(`sellerNotificationPreferences/${uid}`).get();
    return NextResponse.json({ success: true, preferences: { ...defaults, ...(snapshot.val() || {}) } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to update notification preferences.') }, { status: 400 });
  }
}
