import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cleanText, listFromNode, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

function safeInstallationId(value: unknown) {
  const id = cleanText(value, 160);
  return /^[a-zA-Z0-9._-]{8,160}$/.test(id) ? id : '';
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const [securitySnapshot, userRecord] = await Promise.all([
      adminDb.ref(`sellerSecurity/${uid}`).get(),
      adminAuth.getUser(uid),
    ]);
    const security = securitySnapshot.val() || {};
    const devices = listFromNode<Record<string, any>>(security.devices)
      .sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
    const events = listFromNode<Record<string, any>>(security.events)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 50);
    return NextResponse.json({
      devices,
      events,
      auth: {
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        tokensValidAfterTime: userRecord.tokensValidAfterTime || null,
        lastSignInTime: userRecord.metadata.lastSignInTime || null,
        creationTime: userRecord.metadata.creationTime || null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load security information.') }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const action = cleanText(body.action, 40).toLowerCase();
    const now = Date.now();

    if (action === 'heartbeat') {
      const installationId = safeInstallationId(body.installationId);
      if (!installationId) return NextResponse.json({ error: 'A valid device installation ID is required.' }, { status: 400 });
      const ref = adminDb.ref(`sellerSecurity/${uid}/devices/${installationId}`);
      const previous = await ref.get();
      const existing = previous.val() || {};
      const device = {
        platform: cleanText(body.platform, 40),
        platformVersion: cleanText(body.platformVersion, 80),
        appVersion: cleanText(body.appVersion, 40),
        deviceLabel: cleanText(body.deviceLabel, 120) || 'Seller app device',
        firstSeenAt: Number(existing.firstSeenAt || now),
        lastSeenAt: now,
      };
      await ref.set(device);
      if (!previous.exists()) {
        const event = adminDb.ref(`sellerSecurity/${uid}/events`).push();
        await event.set({ type: 'device-added', title: 'New seller app installation recorded', installationId, platform: device.platform, createdAt: now });
      }
      return NextResponse.json({ success: true, device: { id: installationId, ...device } });
    }

    if (action === 'revoke-all') {
      await adminAuth.revokeRefreshTokens(uid);
      const event = adminDb.ref(`sellerSecurity/${uid}/events`).push();
      await event.set({ type: 'sessions-revoked', title: 'All seller sessions were revoked', createdAt: now });
      return NextResponse.json({ success: true, reauthenticate: true });
    }

    if (action === 'remove-device') {
      const installationId = safeInstallationId(body.installationId);
      if (!installationId) return NextResponse.json({ error: 'A valid device installation ID is required.' }, { status: 400 });
      await adminDb.ref(`sellerSecurity/${uid}/devices/${installationId}`).remove();
      const event = adminDb.ref(`sellerSecurity/${uid}/events`).push();
      await event.set({ type: 'device-removed', title: 'Seller app device removed from history', installationId, createdAt: now });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported security action.' }, { status: 400 });
  } catch (error) {
    console.error('Seller security action failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to update security settings.') }, { status: 500 });
  }
}
