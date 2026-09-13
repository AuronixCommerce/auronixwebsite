import { createHmac, randomBytes, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';
import { sendProfessionalEmail } from '@/lib/server-mail';
import { notifySellerApplication, trackingHash, trackingView } from '@/lib/seller-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: any, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const clean = (value: unknown, max = 5000) => String(value || '').trim().slice(0, max);
const secret = () => process.env.SELLER_APPLICATION_OTP_SECRET?.trim() || process.env.AURONIX_VERIFY_SECRET?.trim() || '';
const codeHash = (challenge: string, code: string) => createHmac('sha256', secret()).update(`${challenge}:${code}`).digest('hex');
async function applicationFor(trackingId: string) {
  const index = await adminDb.ref(`sellerApplicationTrackingIndex/${trackingHash(trackingId.toUpperCase())}`).get();
  const id = index.exists() ? String(index.val().applicationId || '') : trackingId;
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) return null;
  const snapshot = await adminDb.ref(`sellerApplications/${id}`).get();
  return snapshot.exists() ? { ...snapshot.val(), id } : null;
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, body.action === 'status' ? 'seller-track-status' : 'seller-application-track', body, { limit: body.action === 'status' ? 120 : 30, windowMs: 15 * 60_000 });
    const action = clean(body.action, 30);
    if (action === 'request-code') {
      if (secret().length < 24) return json({ error: 'Auronix Auth is temporarily unavailable. Please try again shortly.' }, 503);
      const trackingId = clean(body.trackingId, 128);
      const email = clean(body.email, 320).toLowerCase();
      const emailType = body.emailType;
      if (!['personal','business'].includes(emailType) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-zA-Z0-9_-]{8,128}$/.test(trackingId)) return json({ error: 'Enter your tracking ID, email address and email type.' }, 400);
      const challengeId = randomBytes(24).toString('hex');
      const application = await applicationFor(trackingId);
      const recorded = application ? clean(emailType === 'personal' ? application.personalEmail : application.businessEmail || application.email, 320).toLowerCase() : '';
      if (application && email === recorded) {
        const now = Date.now();
        const limit = await adminDb.ref(`sellerTrackingRate/${trackingHash(application.id + ':' + email)}`).transaction(current => {
          if (current && now - Number(current.startedAt) < 30 * 60_000) return Number(current.count) >= 3 ? undefined : { ...current, count: Number(current.count) + 1 };
          return { startedAt: now, count: 1 };
        });
        if (limit.committed) {
          const code = String(randomInt(100000, 1000000));
          await adminDb.ref(`sellerTrackingChallenges/${challengeId}`).set({ applicationId: application.id, email, emailType, codeHash: codeHash(challengeId, code), expiresAt: now + 10 * 60_000, attempts: 0, used: false });
          try {
            await sendProfessionalEmail({ to: email, subject: `${code} — Auronix Auth verification`, body: `Your application tracking verification code is ${code}.\n\nIt expires in 10 minutes. Enter it only on the Auronix application tracking page. Never share this code.` });
          } catch (error) {
            await adminDb.ref(`sellerTrackingChallenges/${challengeId}`).remove();
            throw error;
          }
        }
      }
      // Same response for unmatched records and throttled requests; disclose no application details.
      return json({ success: true, challengeId, message: 'If these details match your application, a code will arrive by email. Codes expire after 10 minutes. Wait before requesting another.' });
    }
    if (action === 'verify-code') {
      const challengeId = clean(body.challengeId, 48), code = clean(body.code, 6);
      if (!/^[a-f0-9]{48}$/.test(challengeId) || !/^\d{6}$/.test(code)) return json({ error: 'Enter the six-digit code from your email.' }, 400);
      const result = await adminDb.ref(`sellerTrackingChallenges/${challengeId}`).transaction(current => {
        if (!current || current.used || current.expiresAt <= Date.now() || current.attempts >= 5) return;
        return { ...current, attempts: Number(current.attempts) + 1, used: current.codeHash === codeHash(challengeId, code) };
      });
      const challenge = result.snapshot.val();
      if (!result.committed || !challenge?.used) return json({ error: 'Auronix Auth: The code is incorrect or expired. Request a new code if needed.' }, 400);
      const token = randomBytes(32).toString('hex');
      await adminDb.ref(`sellerTrackingSessions/${trackingHash(token)}`).set({ applicationId: challenge.applicationId, email: challenge.email, emailType: challenge.emailType, expiresAt: Date.now() + 30 * 60_000 });
      return json({ success: true, token });
    }
    const token = clean(body.token, 64);
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Verify your application email to continue.' }, 401);
    const sessionSnapshot = await adminDb.ref(`sellerTrackingSessions/${trackingHash(token)}`).get();
    const session = sessionSnapshot.val();
    if (!session || session.expiresAt <= Date.now()) return json({ error: 'Your tracking session expired. Verify your email again.' }, 401);
    if (action === 'logout') { await adminDb.ref(`sellerTrackingSessions/${trackingHash(token)}`).remove(); return json({ success: true }); }
    const ref = adminDb.ref(`sellerApplications/${session.applicationId}`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return json({ error: 'This application is unavailable. Please contact support.' }, 404);
    let application = { ...snapshot.val(), id: session.applicationId };
    if (action === 'edit') {
      const allowed = ['fullName','businessName','phone','country','address','city','state','zipCode','website','businessType','yearsInBusiness','productCategories','businessInformation','whyWorkWithAuronix','catalogUrl'];
      const updates: Record<string, string> = {};
      for (const key of allowed) if (key in (body.form || {})) updates[key] = clean(body.form[key]);
      const candidate = { ...application, ...updates };
      for (const key of ['fullName','businessName','phone','country','address','city','state','zipCode','businessType','productCategories']) if (!candidate[key]) return json({ error: 'Complete all required business and address fields.' }, 400);
      if (candidate.businessInformation.length < 30 || candidate.whyWorkWithAuronix.length < 20) return json({ error: 'Please provide more detail about your business and partnership goals.' }, 400);
      if (!/^\d{8,15}$/.test(candidate.phone.replace(/\D/g, ''))) return json({ error: 'Enter a valid phone number with country code.' }, 400);
      if (candidate.yearsInBusiness && (!Number.isFinite(Number(candidate.yearsInBusiness)) || Number(candidate.yearsInBusiness) < 0 || Number(candidate.yearsInBusiness) > 200)) return json({ error: 'Years in business must be between 0 and 200.' }, 400);
      const result = await ref.transaction(current => {
        if (!current || !['pending','changes_requested'].includes(current.status || 'pending')) return;
        return { ...current, ...updates, phoneNormalized: candidate.phone.replace(/\D/g, ''), status: 'pending', reviewMessage: '', aiStatus: 'PENDING', aiScreening: null, aiScore: 0, aiAutoEligible: false, aiAutoApproved: false, updatedAt: Date.now(), applicantEditedAt: Date.now(), revision: Number(current.revision || 0) + 1 };
      });
      if (!result.committed) return json({ error: 'This application is already being reviewed. Use Contact support to request a correction.' }, 409);
      application = { ...result.snapshot.val(), id: session.applicationId };
      await notifySellerApplication(application.id, application, 'Your Auronix application was updated', 'Your corrections have been saved and your application is awaiting review.');
    } else if (action !== 'status') return json({ error: 'Unsupported tracking action.' }, 400);
    return json({ success: true, application: trackingView(application), verifiedEmail: session.email });
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked) return json(blocked.body, blocked.status);
    console.error('Application tracking request failed', error);
    return json({ error: 'We could not complete this tracking request. Please try again shortly.' }, 503);
  }
}
