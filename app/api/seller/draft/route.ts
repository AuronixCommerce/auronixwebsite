import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { normalizePhone } from '@/lib/seller-phone';
import { normalizeEmail } from '@/lib/server-seller-invitations';
import { sendSellerEmailVerification, sendSellerResumeIdEmail } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export const runtime = 'nodejs';
const OTP_TTL = 10 * 60 * 1000;
const DRAFT_TTL = 30 * 24 * 60 * 60 * 1000;
const ALLOWED_FIELDS = new Set(['fullName','businessName','businessEmail','personalEmail','phone','country','address','city','state','zipCode','website','businessType','yearsInBusiness','productCategories','businessInformation','whyWorkWithAuronix','catalogUrl','preferredContact','contactAgreement','sellerPolicyAgreement']);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => process.env.SELLER_APPLICATION_OTP_SECRET?.trim() || process.env.AURONIX_VERIFY_SECRET?.trim() || '';
const otpHash = (draftId: string, email: string, code: string) => createHmac('sha256', secret()).update(`${draftId}:${email}:${code}`).digest('hex');
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const ACTIVE_APPLICATION_STATUSES = new Set(['pending', 'screening', 'approved', 'invited', 'active']);
const cleanCode = (value: unknown) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
const publicDraft = (value: any) => ({ draftId: value.id, resumeId: value.resumeIdLabel, step: Number(value.step || 1), form: value.form || {}, emailVerified: Boolean(value.emailVerified), emailVerifiedAddress: value.emailVerifiedAddress || '' });

async function authorize(draftId: string, resumeId: string) {
  const snapshot = await adminDb.ref(`sellerApplicationDrafts/${draftId}`).get();
  if (!snapshot.exists()) return null;
  const value = snapshot.val();
  const actual = Buffer.from(digest(cleanCode(resumeId)), 'hex');
  const expected = Buffer.from(String(value.resumeCodeHash || ''), 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || Number(value.expiresAt || 0) <= Date.now()) return null;
  return value;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'seller-application-draft', body, { limit: 30, windowMs: 15 * 60_000 });
    const action = String(body?.action || '');
    if (action === 'start') {
      try { normalizePhone(body?.phone); } catch { return NextResponse.json({ error: 'Enter a valid phone number including the country code.' }, { status: 400 }); }
      const draftRef = adminDb.ref('sellerApplicationDrafts').push();
      if (!draftRef.key) throw new Error('Unable to create application draft.');
      const resumeId = `AX-${randomBytes(4).toString('hex').toUpperCase()}`;
      const now = Date.now();
      const draft = { id: draftRef.key, resumeIdLabel: resumeId.slice(0, 5) + '•••••', resumeCodeHash: digest(resumeId), status: 'draft', step: 2, form: { phone: String(body.phone || '').trim() }, emailVerified: false, createdAt: now, updatedAt: now, expiresAt: now + DRAFT_TTL };
      await Promise.all([draftRef.set(draft), adminDb.ref(`sellerApplicationResumeIndex/${digest(resumeId)}`).set({ draftId: draftRef.key, expiresAt: draft.expiresAt })]);
      return NextResponse.json({ success: true, ...publicDraft(draft), draftId: draftRef.key, resumeId });
    }
    if (action === 'resume') {
      const resumeId = cleanCode(body?.resumeId);
      const index = await adminDb.ref(`sellerApplicationResumeIndex/${digest(resumeId)}`).get();
      if (!index.exists()) return NextResponse.json({ error: 'Resume ID is invalid or expired.' }, { status: 404 });
      const value = await authorize(String(index.val().draftId || ''), resumeId);
      if (!value) return NextResponse.json({ error: 'Resume ID is invalid or expired.' }, { status: 404 });
      return NextResponse.json({ success: true, ...publicDraft(value), resumeId });
    }
    const draftId = String(body?.draftId || '');
    const resumeId = cleanCode(body?.resumeId);
    const draft = await authorize(draftId, resumeId);
    if (!draft) return NextResponse.json({ error: 'Your saved application session is invalid or expired.' }, { status: 401 });
    if (action === 'save') {
      const safeForm: Record<string, string | boolean | null> = {};
      for (const [key, value] of Object.entries(body?.form || {})) if (ALLOWED_FIELDS.has(key) && (typeof value === 'string' || typeof value === 'boolean' || value === null)) safeForm[key] = typeof value === 'string' ? value.slice(0, 5000) : value;
      const step = Math.min(5, Math.max(Number(draft.step || 1), Number(body?.step || 1)));
      await adminDb.ref(`sellerApplicationDrafts/${draftId}`).update({ form: { ...(draft.form || {}), ...safeForm }, step, updatedAt: Date.now() });
      return NextResponse.json({ success: true, step });
    }
    if (action === 'email-request') {
      if (!secret() || secret().length < 24) throw new Error('Seller email verification secret is not configured.');
      const type = body?.emailType === 'personal' ? 'personal' : 'business';
      const email = normalizeEmail(body?.email);
      if (!validEmail(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
      try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json({ error: 'A seller account already exists for this email. Use Seller Login or reset the password instead.' }, { status: 409 });
      } catch (accountError: any) {
        if (accountError?.code !== 'auth/user-not-found') throw accountError;
      }
      const applications = await adminDb.ref('sellerApplications').get();
      if (applications.exists()) {
        for (const application of Object.values(applications.val() as Record<string, any>)) {
          const knownEmails = [application.businessEmail, application.personalEmail, application.preferredContactEmail, application.email].map(normalizeEmail).filter(Boolean);
          if (knownEmails.includes(email) && ACTIVE_APPLICATION_STATUSES.has(String(application.status || 'pending').toLowerCase())) {
            return NextResponse.json({ error: 'An active seller application already exists for this email. Resume it or contact support.', code: 'APPLICATION_ALREADY_EXISTS' }, { status: 409 });
          }
        }
      }
      const now = Date.now();
      const requestedAt = Number(draft.emailOtpRequestedAt || 0);
      const count = now - requestedAt < 30 * 60 * 1000 ? Number(draft.emailOtpRequestCount || 0) : 0;
      if (count >= 3) return NextResponse.json({ error: 'Too many email codes requested. Try again later.' }, { status: 429 });
      const code = String(randomInt(100000, 1000000));
      const expiresAt = now + OTP_TTL;
      await adminDb.ref(`sellerApplicationDrafts/${draftId}`).update({ form: { ...(draft.form || {}), preferredContact: type, [type === 'personal' ? 'personalEmail' : 'businessEmail']: email }, emailOtpHash: otpHash(draftId, email, code), emailOtpAddress: email, emailOtpType: type, emailOtpExpiresAt: expiresAt, emailOtpAttempts: 0, emailOtpRequestedAt: now, emailOtpRequestCount: count + 1, emailVerified: false, updatedAt: now });
      await sendSellerEmailVerification({ email, code, expiresAt });
      return NextResponse.json({ success: true, maskedEmail: email.replace(/^(.{2}).*(@.*)$/, '$1••••$2'), expiresAt });
    }
    if (action === 'email-verify') {
      const code = String(body?.code || '').trim();
      if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the six-digit email code.' }, { status: 400 });
      if (Number(draft.emailOtpExpiresAt || 0) <= Date.now()) return NextResponse.json({ error: 'The email code expired. Request a new one.' }, { status: 400 });
      const attempts = Number(draft.emailOtpAttempts || 0);
      if (attempts >= 5 || otpHash(draftId, String(draft.emailOtpAddress), code) !== String(draft.emailOtpHash || '')) {
        await adminDb.ref(`sellerApplicationDrafts/${draftId}`).update({ emailOtpAttempts: attempts + 1, updatedAt: Date.now() });
        return NextResponse.json({ error: attempts >= 4 ? 'Too many incorrect attempts. Request a new code.' : 'Incorrect email verification code.' }, { status: 400 });
      }
      const now = Date.now();
      await adminDb.ref(`sellerApplicationDrafts/${draftId}`).update({ emailVerified: true, emailVerifiedAddress: draft.emailOtpAddress, emailVerifiedType: draft.emailOtpType, emailVerifiedAt: now, emailOtpHash: null, step: Math.max(3, Number(draft.step || 1)), updatedAt: now });
      await sendSellerResumeIdEmail({ email: String(draft.emailOtpAddress), resumeId });
      return NextResponse.json({ success: true, verified: true });
    }
    return NextResponse.json({ error: 'Unsupported draft action.' }, { status: 400 });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Seller application draft failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to update the saved application right now.' }, { status: 500 });
  }
}
