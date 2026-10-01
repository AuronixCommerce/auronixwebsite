import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cleanText, listFromNode, sellerContext, sellerProducts } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

function input(body: Record<string, any>, existing: Record<string, any> = {}) {
  const name = cleanText(body.name ?? existing.name, 180);
  if (!name) throw new Error('Supplier name is required.');
  const now = Date.now();
  return {
    name,
    contact: cleanText(body.contact ?? existing.contact, 180),
    email: cleanText(body.email ?? existing.email, 320).toLowerCase(),
    website: cleanText(body.website ?? existing.website, 500),
    approvalStatus: cleanText(body.approvalStatus ?? existing.approvalStatus ?? 'not-reviewed', 60),
    accountStatus: cleanText(body.accountStatus ?? existing.accountStatus ?? 'active', 60),
    notes: cleanText(body.notes ?? existing.notes, 3000),
    createdAt: Number(existing.createdAt || now),
    updatedAt: now,
  };
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const [snapshot, products, catalogsSnapshot] = await Promise.all([
      adminDb.ref(`sellerSuppliers/${uid}`).get(), sellerProducts(uid), adminDb.ref(`sellerData/${uid}/catalogs`).get(),
    ]);
    const catalogs = listFromNode<Record<string, any>>(catalogsSnapshot.val());
    const suppliers = listFromNode<Record<string, any>>(snapshot.val()).map(supplier => ({
      ...supplier,
      productCount: products.filter(product => product.supplier === supplier.name || product.supplierId === supplier.id).length,
      catalogCount: catalogs.filter(catalog => catalog.supplier === supplier.name || catalog.supplierId === supplier.id).length,
    })).sort((a,b) => String(a.name).localeCompare(String(b.name)));
    return NextResponse.json({ suppliers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to load suppliers.') }, { status: 401 }); }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request); const body = await request.json(); const item = input(body || {});
    const ref = adminDb.ref(`sellerSuppliers/${uid}`).push(); await ref.set(item);
    return NextResponse.json({ success: true, supplier: { id: ref.key, ...item } }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to create supplier.') }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const { uid } = await sellerContext(request); const body = await request.json(); const id = cleanText(body.id, 160);
    if (!id) return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
    const ref = adminDb.ref(`sellerSuppliers/${uid}/${id}`); const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    const item = input(body, snapshot.val()); await ref.set(item);
    return NextResponse.json({ success: true, supplier: { id, ...item } });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to update supplier.') }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await sellerContext(request); const id = cleanText(new URL(request.url).searchParams.get('id'), 160);
    if (!id) return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
    await adminDb.ref(`sellerSuppliers/${uid}/${id}`).remove(); return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to delete supplier.') }, { status: 400 }); }
}
