import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireSeller } from '@/lib/server-auth';

const clean = (value: unknown, max = 2000) => String(value || '').trim().slice(0, max);
const errorResponse = (message: string, code: string, status: number) => NextResponse.json({ error: message, code }, { status });
const list = (value: unknown) => value && typeof value === 'object' ? Object.entries(value as Record<string, unknown>).map(([id, item]) => ({ id, ...(item as object) })) : [];

async function context(request: Request) {
  const decoded = await requireSeller(request);
  const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  if (!profileSnapshot.exists()) throw new Error('Seller profile not found.');
  return { uid: decoded.uid, profile: profileSnapshot.val() };
}

export async function GET(request: Request) {
  try {
    const { uid, profile } = await context(request);
    const [dataSnapshot, applicationSnapshot, ticketsSnapshot] = await Promise.all([
      adminDb.ref(`sellerData/${uid}`).get(),
      profile.sellerApplicationId ? adminDb.ref(`sellerApplications/${profile.sellerApplicationId}`).get() : Promise.resolve(null),
      adminDb.ref('tickets').get(),
    ]);
    const data = dataSnapshot.val() || {};
    return NextResponse.json({
      serverTime: Date.now(),
      profile,
      application: applicationSnapshot?.exists() ? applicationSnapshot.val() : null,
      products: list(data.products),
      catalogs: list(data.catalogs),
      tickets: list(ticketsSnapshot.val()).filter((ticket: any) => ticket.sellerUid === uid).sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
    });
  } catch (error) {
    console.error('Seller workspace load failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return errorResponse('Unable to load the seller workspace.', 'WORKSPACE_LOAD_FAILED', 401);
  }
}

export async function POST(request: Request) {
  try {
    const { uid, profile } = await context(request);
    const body = await request.json();
    const resource = clean(body.resource, 30);
    const now = Date.now();
    if (resource === 'product') {
      const name = clean(body.name, 180);
      const price = clean(body.price, 40);
      if (!name) return errorResponse('Product name is required.', 'VALIDATION_ERROR', 400);
      if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) return errorResponse('Price must be a valid non-negative number.', 'VALIDATION_ERROR', 400);
      const item = { name, sku: clean(body.sku, 100), category: clean(body.category, 150), description: clean(body.description), price, status: 'draft', createdAt: now, updatedAt: now };
      const ref = adminDb.ref(`sellerData/${uid}/products`).push(); await ref.set(item);
      return NextResponse.json({ success: true, item: { id: ref.key, ...item } }, { status: 201 });
    }
    if (resource === 'catalog') {
      const name = clean(body.name, 180); const rawUrl = clean(body.url, 500);
      let url: URL; try { url = new URL(rawUrl); } catch { return errorResponse('Enter a valid catalog URL.', 'VALIDATION_ERROR', 400); }
      if (!name || !['http:', 'https:'].includes(url.protocol)) return errorResponse('Catalog name and a valid HTTPS/HTTP URL are required.', 'VALIDATION_ERROR', 400);
      const item = { name, url: url.toString(), description: clean(body.description), createdAt: now, updatedAt: now };
      const ref = adminDb.ref(`sellerData/${uid}/catalogs`).push(); await ref.set(item);
      const notification = adminDb.ref(`sellerNotifications/${uid}`).push(); await notification.set({ id: notification.key, type: 'catalog', title: 'Catalog added', message: `${name} is now connected to your seller workspace.`, href: '/seller/dashboard/catalogs', createdAt: now });
      return NextResponse.json({ success: true, item: { id: ref.key, ...item } }, { status: 201 });
    }
    if (resource === 'ticket') {
      const subject = clean(body.subject, 150); const category = clean(body.category, 100); const message = clean(body.message, 5000);
      if (!subject || !category || message.length < 10) return errorResponse('Subject, category, and a detailed message are required.', 'VALIDATION_ERROR', 400);
      const item = { name: profile.name || profile.displayName || profile.email || '', email: profile.email || '', sellerUid: uid, sellerEmail: profile.email || '', category, subject, message, status: 'open', createdAt: now, updatedAt: now };
      const ref = adminDb.ref('tickets').push(); await ref.set(item);
      return NextResponse.json({ success: true, item: { id: ref.key, ...item } }, { status: 201 });
    }
    return errorResponse('Unsupported seller workspace action.', 'UNSUPPORTED_ACTION', 400);
  } catch (error) {
    console.error('Seller workspace create failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return errorResponse('Unable to save this item right now.', 'WORKSPACE_SAVE_FAILED', 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid } = await context(request); const body = await request.json();
    const displayName = clean(body.displayName, 160); const website = clean(body.website, 500);
    if (!displayName) return errorResponse('Display name is required.', 'VALIDATION_ERROR', 400);
    if (website) { try { const url = new URL(website); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { return errorResponse('Enter a valid website URL.', 'VALIDATION_ERROR', 400); } }
    const updates = { displayName, name: displayName, businessName: clean(body.businessName, 200), phone: clean(body.phone, 60), website, updatedAt: Date.now() };
    await adminDb.ref(`users/${uid}`).update(updates);
    return NextResponse.json({ success: true, profile: updates });
  } catch (error) {
    console.error('Seller profile update failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return errorResponse('Unable to update the seller profile.', 'PROFILE_UPDATE_FAILED', 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await context(request); const url = new URL(request.url);
    const resource = url.searchParams.get('resource'); const id = clean(url.searchParams.get('id'), 200);
    if (!id || !['product', 'catalog'].includes(resource || '')) return errorResponse('A valid resource and item ID are required.', 'VALIDATION_ERROR', 400);
    await adminDb.ref(`sellerData/${uid}/${resource === 'product' ? 'products' : 'catalogs'}/${id}`).remove();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller workspace delete failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return errorResponse('Unable to delete this item.', 'WORKSPACE_DELETE_FAILED', 500);
  }
}
