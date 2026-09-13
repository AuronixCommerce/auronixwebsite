import { userFacingError } from '@/lib/user-facing-error';
import { createHmac, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/server-auth';
import { adminMfaConfigured } from '@/lib/server-admin-session';
import { sendAdminMfaCodeEmail } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export async function POST(request: Request) {
  try {
    const body = await request.json(); await protectPublicRequest(request, 'admin-mfa-request', body, { limit: 5, windowMs: 15 * 60_000 });
    const decoded = await verifyIdToken(request); const profile = (await adminDb.ref(`users/${decoded.uid}`).get()).val();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    if (!adminMfaConfigured()) return NextResponse.json({ success: true, required: false });
    const existing = (await adminDb.ref(`adminMfaChallenges/${decoded.uid}`).get()).val(); if (Date.now() - Number(existing?.sentAt || 0) < 60_000) return NextResponse.json({ success: true, required: true, message: 'A security code was recently sent.' });
    const email = String(decoded.email || profile.email || ''); if (!email) return NextResponse.json({ error: 'Admin account has no email address.' }, { status: 400 });
    const code = String(randomInt(100000, 1000000)); const expiresAt = Date.now() + 10 * 60_000; const hash = createHmac('sha256', process.env.ADMIN_MFA_SECRET || '').update(`${decoded.uid}:${code}`).digest('hex');
    await adminDb.ref(`adminMfaChallenges/${decoded.uid}`).set({ codeHash: hash, attempts: 0, expiresAt, sentAt: Date.now(), device: String(body?.device || '').slice(0, 200) });
    await sendAdminMfaCodeEmail({ email, code, expiresAt, device: String(body?.device || '').slice(0, 100) });
    return NextResponse.json({ success: true, required: true, emailMasked: email.replace(/^(.{2}).*(@.*)$/, '$1••••$2') });
  } catch (error) { const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status }); return NextResponse.json({ error: error instanceof Error ? userFacingError(error) : 'Unable to request security code.' }, { status: 500 }); }
}
