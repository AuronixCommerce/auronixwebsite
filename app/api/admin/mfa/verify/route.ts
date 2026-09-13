import { userFacingError } from '@/lib/user-facing-error';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/server-auth';
import { ADMIN_SESSION_COOKIE, createAdminSessionValue } from '@/lib/server-admin-session';
import { writeAuditLog } from '@/lib/server-audit';

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request); const body = await request.json(); const code = String(body?.code || '').replace(/\D/g, '').slice(0, 6);
    const profile = (await adminDb.ref(`users/${decoded.uid}`).get()).val(); if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    const challengeRef = adminDb.ref(`adminMfaChallenges/${decoded.uid}`); const challenge = (await challengeRef.get()).val();
    if (!challenge || Number(challenge.expiresAt || 0) <= Date.now()) return NextResponse.json({ error: 'The security code expired. Request a new one.' }, { status: 410 });
    if (Number(challenge.attempts || 0) >= 5) return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 });
    const supplied = createHmac('sha256', process.env.ADMIN_MFA_SECRET || '').update(`${decoded.uid}:${code}`).digest('hex'); const stored = String(challenge.codeHash || '');
    if (stored.length !== supplied.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(supplied))) { await challengeRef.update({ attempts: Number(challenge.attempts || 0) + 1 }); return NextResponse.json({ error: 'The security code is incorrect.' }, { status: 400 }); }
    const expiresAt = Date.now() + 12 * 60 * 60_000; const session = createAdminSessionValue(decoded.uid, expiresAt); const device = String(body?.device || challenge.device || 'Browser').slice(0, 200);
    await Promise.all([challengeRef.remove(), adminDb.ref(`adminSessions/${decoded.uid}/${session.id}`).set({ id: session.id, device, userAgent: String(request.headers.get('user-agent') || '').slice(0, 500), createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt })]);
    await writeAuditLog({ actorUid: decoded.uid, actorEmail: decoded.email || '', action: 'ADMIN_MFA_VERIFIED', targetType: 'adminSession', targetId: session.id, summary: `New admin session verified for ${device}.`, request });
    const response = NextResponse.json({ success: true, expiresAt }); response.cookies.set(ADMIN_SESSION_COOKIE, session.value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(expiresAt) }); return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? userFacingError(error) : 'Unable to verify security code.' }, { status: 500 }); }
}
