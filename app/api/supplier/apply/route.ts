import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

const clean = (value: unknown, max = 2000) => String(value || '').trim().slice(0, max);
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'supplier-application', body, { limit: 5, windowMs: 60 * 60_000 });
    const companyName = clean(body.companyName, 200); const contactName = clean(body.contactName, 160);
    const email = clean(body.email, 320).toLowerCase(); const phone = clean(body.phone, 60); const categories = clean(body.categories, 1000);
    if (!companyName || !contactName || !validEmail(email) || !phone || !categories || body.consent !== true) {
      return NextResponse.json({ error: 'Complete all required supplier fields and accept the contact agreement.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const existing = await adminDb.ref('suppliers').get();
    if (existing.exists()) {
      const duplicate = Object.values(existing.val() as Record<string, any>).some((supplier) => clean(supplier.email).toLowerCase() === email && !['rejected', 'closed'].includes(clean(supplier.status).toLowerCase()));
      if (duplicate) return NextResponse.json({ error: 'An active supplier submission already exists for this email.', code: 'SUPPLIER_SUBMISSION_EXISTS' }, { status: 409 });
    }
    const now = Date.now();
    const submission = { companyName, contactName, email, phone, website: clean(body.website, 500), country: clean(body.country, 100), categories, yearsInBusiness: clean(body.yearsInBusiness, 20), distributionModel: clean(body.distributionModel, 100), catalogUrl: clean(body.catalogUrl, 500), message: clean(body.message, 5000), status: 'new', source: 'supplier-page', createdAt: now, updatedAt: now };
    const ref = adminDb.ref('suppliers').push(); await ref.set({ id: ref.key, ...submission });
    return NextResponse.json({ success: true, submissionId: ref.key }, { status: 201 });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Supplier submission failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ error: 'Unable to submit supplier information right now. Please retry.', code: 'SUPPLIER_SUBMISSION_FAILED' }, { status: 500 });
  }
}
