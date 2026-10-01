import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { deletePrivateObject, getPrivateObject, putPrivateObject, safeObjectName } from '@/lib/server-r2';
import { cleanText, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maxBytes = 8 * 1024 * 1024;
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function productRef(uid: string, productId: string) {
  const ref = adminDb.ref(`sellerData/${uid}/products/${productId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists()) throw new Error('Product not found.');
  return ref;
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const url = new URL(request.url);
    const productId = cleanText(url.searchParams.get('productId'), 160);
    const imageId = cleanText(url.searchParams.get('imageId'), 160);
    if (!productId) return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    await productRef(uid, productId);

    if (!imageId) {
      const snapshot = await adminDb.ref(`sellerProductImages/${uid}/${productId}`).get();
      const value = snapshot.val() || {};
      const images = Object.entries(value as Record<string, any>)
        .map(([id, item]) => ({ id, fileName: cleanText(item?.fileName, 220), contentType: cleanText(item?.contentType, 100), size: Number(item?.size || 0), createdAt: Number(item?.createdAt || 0) }))
        .sort((a, b) => a.createdAt - b.createdAt);
      return NextResponse.json({ images }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const snapshot = await adminDb.ref(`sellerProductImages/${uid}/${productId}/${imageId}`).get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Product image not found.' }, { status: 404 });
    const item = snapshot.val() || {};
    if (!item.storageKey) return NextResponse.json({ error: 'Product image file is unavailable.' }, { status: 404 });
    const stored = await getPrivateObject(String(item.storageKey));
    return new Response(stored.body, {
      status: 200,
      headers: {
        'Content-Type': stored.contentType || item.contentType || 'application/octet-stream',
        'Content-Length': String(stored.body.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load product images.') }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const form = await request.formData();
    const productId = cleanText(form.get('productId'), 160);
    const file = form.get('file');
    if (!productId) return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a product image.' }, { status: 400 });
    if (!allowed.has(file.type)) return NextResponse.json({ error: 'Product images must be JPG, PNG, or WebP.' }, { status: 400 });
    if (file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: 'Product images must be between 1 byte and 8 MB.' }, { status: 400 });
    const product = await productRef(uid, productId);
    const current = await adminDb.ref(`sellerProductImages/${uid}/${productId}`).get();
    if (current.numChildren() >= 8) return NextResponse.json({ error: 'A product can have up to 8 images.' }, { status: 409 });

    const imageRef = adminDb.ref(`sellerProductImages/${uid}/${productId}`).push();
    if (!imageRef.key) throw new Error('Unable to create image reference.');
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${safeObjectName(file.name.replace(/\.[^.]+$/, '') || 'product')}.${extension}`;
    const storageKey = `seller-product-images/${uid}/${productId}/${imageRef.key}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await putPrivateObject(storageKey, buffer, file.type);
    const item = { fileName, contentType: file.type, size: file.size, storageKey, createdAt: Date.now() };
    await imageRef.set(item);
    await product.child(`imageIds/${imageRef.key}`).set(true);
    await product.update({ updatedAt: Date.now() });
    return NextResponse.json({ success: true, image: { id: imageRef.key, fileName, contentType: file.type, size: file.size, createdAt: item.createdAt } }, { status: 201 });
  } catch (error) {
    console.error('Seller product image upload failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to upload this product image.') }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const url = new URL(request.url);
    const productId = cleanText(url.searchParams.get('productId'), 160);
    const imageId = cleanText(url.searchParams.get('imageId'), 160);
    if (!productId || !imageId) return NextResponse.json({ error: 'Product and image IDs are required.' }, { status: 400 });
    const product = await productRef(uid, productId);
    const ref = adminDb.ref(`sellerProductImages/${uid}/${productId}/${imageId}`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Product image not found.' }, { status: 404 });
    const item = snapshot.val() || {};
    if (item.storageKey) await deletePrivateObject(String(item.storageKey)).catch(error => console.error('Product image object cleanup failed:', error));
    await ref.remove();
    await product.child(`imageIds/${imageId}`).remove();
    await product.update({ updatedAt: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to delete this product image.') }, { status: 400 });
  }
}
