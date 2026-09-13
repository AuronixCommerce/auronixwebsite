import { userFacingError } from '@/lib/user-facing-error';
import { createTrackingId, trackingHash, notifySellerApplication } from '@/lib/seller-tracking';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { normalizePhone } from '@/lib/seller-phone';
import { normalizeEmail } from '@/lib/server-seller-invitations';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export const runtime = 'nodejs';

const SELLER_POLICY_VERSION = '2026-08-15';
const APPLICATION_VERSION = 'seller-application-v7-resumable-email-verified';
const ACTIVE_APPLICATION_STATUSES = new Set(['pending', 'screening', 'under_review', 'changes_requested', 'approved', 'invited', 'active']);
const emailKey = (email: string) => createHash('sha256').update(email).digest('hex');

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'seller-application-submit', body, { limit: 5, windowMs: 60 * 60_000 });
    const form = body?.form || {};
    const draftId = text(body?.draftId);
    const resumeId = text(body?.resumeId).toUpperCase().replace(/\s+/g, '');


    const required: Array<[string, string]> = [
      ['Full Name', text(form.fullName)],
      ['Business Name', text(form.businessName)],
      ['Phone', text(form.phone)],
      ['Country', text(form.country)],
      ['Street Address', text(form.address)],
      ['City', text(form.city)],
      ['State / Province', text(form.state)],
      ['ZIP / Postal Code', text(form.zipCode)],
      ['Business Type', text(form.businessType)],
      ['Product Categories', text(form.productCategories)],
      ['Business Information', text(form.businessInformation)],
      ['Why do you want to work with Auronix?', text(form.whyWorkWithAuronix)],
    ];

    for (const [label, value] of required) {
      if (!value) {
        return NextResponse.json({ success: false, error: `${label} is required.` }, { status: 400 });
      }
    }

    const businessEmail = normalizeEmail(form.businessEmail);
    const personalEmail = normalizeEmail(form.personalEmail);
    if (form.sellerPolicyAgreement !== true || form.contactAgreement !== true) {
      return NextResponse.json({ success: false, error: 'Seller Policy and contact agreements are required.' }, { status: 400 });
    }

    const preferredContact = text(form.preferredContact);
    if (preferredContact !== 'business' && preferredContact !== 'personal') {
      return NextResponse.json({ success: false, error: 'Select your preferred contact email.' }, { status: 400 });
    }
    const preferredContactEmail = preferredContact === 'personal' ? personalEmail : businessEmail;
    if (!validEmail(preferredContactEmail) || (businessEmail && !validEmail(businessEmail)) || (personalEmail && !validEmail(personalEmail))) {
      return NextResponse.json({ success: false, error: 'Please enter a valid selected contact email.' }, { status: 400 });
    }

    if (!draftId || !resumeId) {
      return NextResponse.json({ success: false, error: 'A saved and email-verified application session is required.' }, { status: 403 });
    }
    const draftSnapshot = await adminDb.ref(`sellerApplicationDrafts/${draftId}`).get();
    const draft = draftSnapshot.exists() ? draftSnapshot.val() : null;
    const resumeCodeHash = createHash('sha256').update(resumeId).digest('hex');
    if (!draft || draft.resumeCodeHash !== resumeCodeHash || !draft.emailVerified || normalizeEmail(draft.emailVerifiedAddress) !== preferredContactEmail || Number(draft.expiresAt || 0) <= Date.now() || draft.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'A valid saved application with a verified contact email is required.' }, { status: 403 });
    }

    try {
      await adminAuth.getUserByEmail(preferredContactEmail);
      return NextResponse.json({ success: false, error: `An account already exists for the selected ${preferredContact} email. Choose another email, sign in, or reset its password.`, field: preferredContact === 'personal' ? 'personalEmail' : 'businessEmail', code: 'SELLER_ACCOUNT_EXISTS' }, { status: 409 });
    } catch (accountError: any) {
      if (accountError?.code !== 'auth/user-not-found') throw accountError;
    }

    const applicationsSnapshot = await adminDb.ref('sellerApplications').get();
    if (applicationsSnapshot.exists()) {
      for (const application of Object.values(applicationsSnapshot.val() as Record<string, any>)) {
        const emails = [application.businessEmail, application.personalEmail, application.preferredContactEmail, application.email].map(normalizeEmail);
        if (emails.includes(preferredContactEmail) && ACTIVE_APPLICATION_STATUSES.has(String(application.status || 'pending').toLowerCase())) {
          return NextResponse.json({ success: false, error: `An active seller application already exists for the selected ${preferredContact} email. Resume that application or contact support.`, field: preferredContact === 'personal' ? 'personalEmail' : 'businessEmail', code: 'APPLICATION_ALREADY_EXISTS' }, { status: 409 });
        }
      }
    }

    const businessInformation = text(form.businessInformation);
    const whyWorkWithAuronix = text(form.whyWorkWithAuronix);
    if (businessInformation.length < 30 || whyWorkWithAuronix.length < 20) {
      return NextResponse.json({ success: false, error: 'Please provide more detail about your business and partnership goals.' }, { status: 400 });
    }

    const yearsInBusiness = text(form.yearsInBusiness);
    if (yearsInBusiness) {
      const years = Number(yearsInBusiness);
      if (!Number.isFinite(years) || years < 0 || years > 200) {
        return NextResponse.json({ success: false, error: 'Years in Business must be between 0 and 200.' }, { status: 400 });
      }
    }

    let normalizedPhone: string;
    try { normalizedPhone = normalizePhone(form.phone); } catch { return NextResponse.json({ success: false, error: 'Enter a valid phone number including the country code.' }, { status: 400 }); }

    const applicationRef = adminDb.ref('sellerApplications').push();
    const applicationId = applicationRef.key;
    if (!applicationId) throw new Error('Unable to create application ID.');

    const emailIndexRef = adminDb.ref(`sellerApplicationEmailIndex/${emailKey(preferredContactEmail)}`);
    const existingReservation = await emailIndexRef.get();
    const reservedApplicationId = String(existingReservation.val()?.applicationId || '');
    if (reservedApplicationId) {
      const reservedStatus = await adminDb.ref(`sellerApplications/${reservedApplicationId}/status`).get();
      if (!reservedStatus.exists() || !ACTIVE_APPLICATION_STATUSES.has(String(reservedStatus.val()).toLowerCase())) await emailIndexRef.remove();
    }
    const reservation = await emailIndexRef.transaction((current) => current || { applicationId, createdAt: Date.now() });
    if (!reservation.committed || reservation.snapshot.val()?.applicationId !== applicationId) {
      return NextResponse.json({ success: false, error: 'An active seller application already exists for this email.', code: 'APPLICATION_ALREADY_EXISTS' }, { status: 409 });
    }

    const timestamp = Date.now();
    const trackingId = createTrackingId();
    const application = {
      id: applicationId,
      trackingId,
      applicationVersion: APPLICATION_VERSION,
      source: 'seller-application',
      status: 'pending',
      fullName: text(form.fullName),
      businessName: text(form.businessName),
      businessEmail,
      personalEmail,
      preferredContactType: preferredContact,
      preferredContactEmail,
      phone: text(form.phone),
      phoneNormalized: normalizedPhone,
      country: text(form.country),
      address: text(form.address),
      city: text(form.city),
      state: text(form.state),
      zipCode: text(form.zipCode),
      website: text(form.website),
      businessType: text(form.businessType),
      yearsInBusiness,
      productCategories: text(form.productCategories),
      businessInformation,
      whyWorkWithAuronix,
      catalogUrl: text(form.catalogUrl),
      contactAgreement: true,
      sellerPolicyAgreed: true,
      sellerPolicyVersion: SELLER_POLICY_VERSION,
      sellerPolicyAgreedAt: timestamp,
      emailVerified: true,
      emailVerifiedAt: Number(draft.emailVerifiedAt || timestamp),
      applicationDraftId: draftId,
      aiStatus: 'PENDING',
      aiScore: 0,
      aiAutoEligible: false,
      aiAutoApproved: false,
      aiScreening: null,
      accountCreated: false,
      accountCreationStatus: 'not_started',
      invitationSentAt: null,
      invitationSentBy: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await applicationRef.set(application);
      await adminDb.ref(`sellerApplicationTrackingIndex/${trackingHash(trackingId)}`).set({ applicationId });
      await adminDb.ref(`sellerApplicationDrafts/${draftId}`).update({ status: 'submitted', submittedAt: timestamp, applicationId, trackingId, updatedAt: timestamp });
      // Retain the private resume lookup so returning applicants can reach tracking.
    } catch (persistenceError) {
      await applicationRef.remove().catch(() => undefined);
      await adminDb.ref(`sellerApplicationTrackingIndex/${trackingHash(trackingId)}`).remove().catch(() => undefined);
      await emailIndexRef.transaction((current) => current?.applicationId === applicationId ? null : current).catch(() => undefined);
      throw persistenceError;
    }

    const emailSent = await notifySellerApplication(applicationId, application, 'Your Auronix seller application is in progress', 'Your application was submitted successfully and is awaiting review. Your resume ID has been replaced by the tracking ID below.');
    return NextResponse.json({ success: true, applicationId, trackingId, emailSent });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Seller application submission failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Unable to submit your application right now. Please retry.', code: 'APPLICATION_SUBMISSION_FAILED' },
      { status: 500 }
    );
  }
}
