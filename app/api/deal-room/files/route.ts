import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin, verifyIdToken } from '@/lib/server-auth';
import { appendDealRoomTimeline, ensureDealRoom } from '@/lib/deal-room';
import { safeObjectName, getPrivateObject, putPrivateObject } from '@/lib/server-r2';
import { validatePartnerFile, validDocumentType } from '@/lib/document-upload';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function access(request: Request, applicationId: string) {
  const decoded = await verifyIdToken(request);
  const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  const profile = profileSnapshot.val();
  const role = decoded.role || profile?.role;
  if (role === 'admin') { await requireAdmin(request); return { uid: decoded.uid, email: decoded.email || profile?.email || '', role: 'admin' as const }; }
  if (role !== 'seller' || profile?.sellerApplicationId !== applicationId) throw new Error('You do not have access to this partner record.');
  return { uid: decoded.uid, email: decoded.email || profile?.email || '', role: 'seller' as const };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const applicationId = clean(form.get('applicationId'), 160);
    if (!/^[a-zA-Z0-9_-]{8,160}$/.test(applicationId)) return fail('Select a valid application.');
    const actor = await access(request, applicationId);
    const file = form.get('file');
    const type = form.get('type');
    const expiryValue = clean(form.get('expiresAt'), 40);
    if (!(file instanceof File)) return fail('Choose a document to upload.');
    const fileError = validatePartnerFile(file);
    if (fileError) return fail(fileError);
    if (!validDocumentType(type)) return fail('Choose a valid document type.');
    const expiry = expiryValue ? Date.parse(expiryValue) : NaN;
    if (expiryValue && (!Number.isFinite(expiry) || expiry <= Date.now())) return fail('Document expiry must be a future date.');
    const applicationSnapshot = await adminDb.ref(`sellerApplications/${applicationId}`).get();
    if (!applicationSnapshot.exists()) return fail('Application not found.', 404);
    await ensureDealRoom(applicationId, applicationSnapshot.val());
    const id = String(adminDb.ref(`partnerDealRooms/${applicationId}/documents`).push().key);
    const storageKey = `partner-deal-rooms/${applicationId}/${Date.now()}-${randomBytes(6).toString('hex')}-${safeObjectName(file.name)}`;
    await putPrivateObject(storageKey, Buffer.from(await file.arrayBuffer()), file.type);
    const document = { id, name: safeObjectName(file.name), type, mimeType: file.type, size: file.size, storageKey, status: 'pending', expiresAt: Number.isFinite(expiry) ? expiry : null, uploadedAt: Date.now(), uploadedBy: actor.uid, uploadedByRole: actor.role };
    await adminDb.ref(`partnerDealRooms/${applicationId}/documents/${id}`).set(document);
    await appendDealRoomTimeline(applicationId, { type: 'document', title: 'Document uploaded', description: `${document.name} was securely added for review.`, actorRole: actor.role, actorEmail: actor.email });
    await writeAuditLog({ actorUid: actor.uid, actorEmail: actor.email, action: 'DOCUMENT_UPLOAD', targetType: 'partnerDocument', targetId: id, summary: document.name, metadata: { applicationId, type, size: file.size }, request });
    return NextResponse.json({ success: true, document: { ...document, storageKey: undefined } }, { status: 201 });
  } catch (caught) {
    console.error('Secure partner upload failed:', caught instanceof Error ? caught.message : caught);
    return fail(userFacingError(caught, 'Unable to upload this document.'), 500);
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const applicationId = clean(url.searchParams.get('applicationId'), 160);
    const documentId = clean(url.searchParams.get('documentId'), 160);
    await access(request, applicationId);
    const snapshot = await adminDb.ref(`partnerDealRooms/${applicationId}/documents/${documentId}`).get();
    if (!snapshot.exists()) return fail('Document not found.', 404);
    const document = snapshot.val();
    const object = await getPrivateObject(document.storageKey);
    return new NextResponse(object.body as any, { status: 200, headers: { 'Content-Type': document.mimeType || object.contentType, 'Content-Disposition': `attachment; filename="${safeObjectName(document.name)}"`, 'Content-Length': String(object.body.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (caught) {
    return fail(userFacingError(caught, 'Unable to download this document.'), 401);
  }
}
