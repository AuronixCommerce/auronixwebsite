import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';
import { randomBytes } from 'crypto';
import { validatePartnerFile } from '@/lib/document-upload';
import { putPrivateObject, safeObjectName } from '@/lib/server-r2';
import { sendProfessionalEmail } from '@/lib/server-mail';

const clean = (value: unknown, max = 2000) => String(value || '').trim().slice(0, max);
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const formData = contentType.includes('multipart/form-data') ? await request.formData() : null;
    const body: any = formData ? Object.fromEntries(Array.from(formData.entries()).filter(([, value]) => typeof value === 'string')) : await request.json();
    if (body.consent === 'true') body.consent = true;
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
    const files = formData ? [
      { file: formData.get('catalogFile'), type: 'catalog' },
      { file: formData.get('authorizationFile'), type: 'brand-authorization' },
    ].filter((entry): entry is { file: File; type: string } => entry.file instanceof File && entry.file.size > 0) : [];
    for (const { file } of files) {
      const validation = validatePartnerFile(file);
      if (validation) return NextResponse.json({ error: validation, code: 'DOCUMENT_VALIDATION_ERROR' }, { status: 400 });
    }
    const now = Date.now();
    const ref = adminDb.ref('suppliers').push();
    const submissionId = String(ref.key);
    const documents: Record<string, any> = {};
    for (const { file, type } of files) {
      const documentId = String(adminDb.ref(`suppliers/${submissionId}/documents`).push().key);
      const storageKey = `supplier-submissions/${submissionId}/${now}-${randomBytes(6).toString('hex')}-${safeObjectName(file.name)}`;
      await putPrivateObject(storageKey, Buffer.from(await file.arrayBuffer()), file.type);
      documents[documentId] = { id: documentId, name: safeObjectName(file.name), type, mimeType: file.type, size: file.size, storageKey, status: 'pending', expiresAt: null, uploadedAt: now, uploadedByRole: 'supplier' };
    }
    const commercial = { brands: clean(body.brands, 1000), minimumOrderQuantity: clean(body.minimumOrderQuantity, 120), pricingModel: clean(body.pricingModel, 200), currency: clean(body.currency || 'USD', 12).toUpperCase(), leadTimeDays: clean(body.leadTimeDays, 40), incoterms: clean(body.incoterms, 80).toUpperCase(), notes: clean(body.commercialNotes, 3000) };
    const submission = { companyName, contactName, email, phone, website: clean(body.website, 500), country: clean(body.country, 100), categories, yearsInBusiness: clean(body.yearsInBusiness, 20), distributionModel: clean(body.distributionModel, 100), catalogUrl: clean(body.catalogUrl, 500), commercial, documents, message: clean(body.message, 5000), status: 'new', source: 'supplier-page', createdAt: now, updatedAt: now };
    await ref.set({ id: submissionId, ...submission });
    const mailRef = adminDb.ref('emailDeliveryLogs').push();
    await mailRef.set({ id: mailRef.key, recipient: email, subject: 'Your Auronix supplier submission was received', event: 'supplier-submitted', status: 'queued', createdAt: now, updatedAt: now });
    try {
      const info: any = await sendProfessionalEmail({ to: email, name: contactName, subject: 'Your Auronix supplier submission was received', body: `We received the supplier submission for ${companyName}. Our team will review the business information, commercial terms, and any documents provided.\n\nReference: ${submissionId}` }, 'notification');
      await mailRef.update({ status: 'sent', providerMessageId: clean(info?.messageId, 500), updatedAt: Date.now() });
    } catch (mailError) {
      await mailRef.update({ status: 'failed', error: clean(mailError instanceof Error ? mailError.message : mailError, 1000), updatedAt: Date.now() });
    }
    return NextResponse.json({ success: true, submissionId }, { status: 201 });
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error); if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
    console.error('Supplier submission failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ error: 'Unable to submit supplier information right now. Please retry.', code: 'SUPPLIER_SUBMISSION_FAILED' }, { status: 500 });
  }
}
