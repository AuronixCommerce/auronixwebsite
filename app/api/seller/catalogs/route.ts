import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { deletePrivateObject, putPrivateObject, safeObjectName } from '@/lib/server-r2';
import { cleanText, listFromNode, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maxBytes = 25 * 1024 * 1024;
const allowedExtensions = new Set(['pdf', 'csv', 'xlsx', 'xls']);
const publicCatalog = (item: Record<string, any>) => {
  const { storageKey, ...safe } = item;
  return safe;
};

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const snapshot = await adminDb.ref(`sellerData/${uid}/catalogs`).get();
    const catalogs = listFromNode<Record<string, any>>(snapshot.val())
      .map(publicCatalog)
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
    return NextResponse.json({ catalogs, serverTime: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load catalogs.') }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a catalog file to upload.' }, { status: 400 });
    const supplier = cleanText(form.get('supplier'), 180);
    const description = cleanText(form.get('description'), 2000);
    const name = cleanText(form.get('name') || file.name, 180);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.has(extension)) return NextResponse.json({ error: 'Catalogs must be PDF, CSV, XLSX, or XLS files.' }, { status: 400 });
    if (file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: 'Catalog files must be between 1 byte and 25 MB.' }, { status: 400 });

    const ref = adminDb.ref(`sellerData/${uid}/catalogs`).push();
    if (!ref.key) throw new Error('Unable to create catalog reference.');
    const now = Date.now();
    const storageKey = `seller-catalogs/${uid}/${ref.key}/${safeObjectName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await putPrivateObject(storageKey, buffer, file.type || 'application/octet-stream');
    const item = {
      id: ref.key,
      name,
      originalName: file.name,
      supplier,
      description,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      storageKey,
      status: 'uploaded',
      aiStatus: 'not-analyzed',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await ref.set(item);
    const notification = adminDb.ref(`sellerNotifications/${uid}`).push();
    await notification.set({ id: notification.key, type: 'catalog', title: 'Catalog uploaded', message: `${name} was uploaded securely and is ready for processing.`, catalogId: ref.key, href: '/seller/dashboard/catalogs', createdAt: now });
    return NextResponse.json({ success: true, catalog: publicCatalog(item) }, { status: 201 });
  } catch (error) {
    console.error('Seller catalog upload failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to upload this catalog.') }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const id = cleanText(new URL(request.url).searchParams.get('id'), 160);
    if (!id) return NextResponse.json({ error: 'Catalog ID is required.' }, { status: 400 });
    const ref = adminDb.ref(`sellerData/${uid}/catalogs/${id}`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Catalog not found.' }, { status: 404 });
    const item = snapshot.val() || {};
    if (item.storageKey) await deletePrivateObject(String(item.storageKey)).catch(error => console.error('Catalog object cleanup failed:', error));
    await ref.remove();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to delete this catalog.') }, { status: 400 });
  }
}
