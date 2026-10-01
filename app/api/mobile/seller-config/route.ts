import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await adminDb.ref('settings/sellerMobileApp').get();
    if (!snapshot.exists()) {
      return NextResponse.json({ configured: false }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }
    const value = snapshot.val() || {};
    return NextResponse.json({
      configured: true,
      latestVersion: String(value.latestVersion || '').trim(),
      minimumVersion: String(value.minimumVersion || '').trim(),
      forceUpdate: value.forceUpdate === true,
      message: String(value.message || '').trim().slice(0, 500),
      androidStoreUrl: String(value.androidStoreUrl || '').trim().slice(0, 1000),
      iosStoreUrl: String(value.iosStoreUrl || '').trim().slice(0, 1000),
    }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error('Seller mobile config load failed:', error);
    return NextResponse.json({ configured: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
