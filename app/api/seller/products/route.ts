import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  asNumber,
  cleanText,
  normalizeProduct,
  sellerContext,
  sellerProducts,
} from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['draft', 'review', 'active', 'rejected', 'paused', 'archived']);

function productInput(body: Record<string, any>, existing: Record<string, any> = {}) {
  const now = Date.now();
  const name = cleanText(body.name ?? body.title ?? existing.name ?? existing.title, 180);
  if (!name) throw new Error('Product name is required.');
  const statusCandidate = cleanText(body.status ?? existing.status ?? 'draft', 30).toLowerCase();
  const status = allowedStatuses.has(statusCandidate) ? statusCandidate : 'draft';
  const numeric = (key: string, fallback?: unknown) => {
    const value = key in body ? body[key] : fallback;
    const parsed = asNumber(value);
    if (value !== '' && value !== null && value !== undefined && parsed === null) throw new Error(`${key} must be a valid number.`);
    if (parsed !== null && parsed < 0) throw new Error(`${key} cannot be negative.`);
    return parsed;
  };
  return {
    name,
    title: name,
    brand: cleanText(body.brand ?? existing.brand, 120),
    sku: cleanText(body.sku ?? existing.sku, 100),
    upc: cleanText(body.upc ?? existing.upc, 40),
    ean: cleanText(body.ean ?? existing.ean, 40),
    asin: cleanText(body.asin ?? existing.asin, 40),
    category: cleanText(body.category ?? existing.category, 150),
    description: cleanText(body.description ?? existing.description, 5000),
    cost: numeric('cost', existing.cost),
    sellingPrice: numeric('sellingPrice', body.price ?? existing.sellingPrice ?? existing.price),
    marketplaceFees: numeric('marketplaceFees', existing.marketplaceFees),
    fulfillmentFees: numeric('fulfillmentFees', body.shippingFees ?? existing.fulfillmentFees ?? existing.shippingFees),
    inventoryQuantity: numeric('inventoryQuantity', body.inventory ?? existing.inventoryQuantity ?? existing.inventory) ?? 0,
    lowStockThreshold: numeric('lowStockThreshold', existing.lowStockThreshold) ?? 0,
    supplier: cleanText(body.supplier ?? existing.supplier, 180),
    marketplace: cleanText(body.marketplace ?? existing.marketplace, 80),
    imageUrls: Array.isArray(body.imageUrls ?? existing.imageUrls)
      ? (body.imageUrls ?? existing.imageUrls).map((value: unknown) => cleanText(value, 1000)).filter(Boolean).slice(0, 12)
      : [],
    status,
    updatedAt: now,
    createdAt: Number(existing.createdAt || now),
    version: Number(existing.version || 0) + 1,
  };
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const url = new URL(request.url);
    const q = cleanText(url.searchParams.get('q'), 200).toLowerCase();
    const status = cleanText(url.searchParams.get('status'), 30).toLowerCase();
    const sort = cleanText(url.searchParams.get('sort') || 'newest', 40);
    let products = await sellerProducts(uid);
    if (q) products = products.filter(product => [product.name, product.sku, product.upc, product.ean, product.asin, product.brand, product.category]
      .some(value => String(value || '').toLowerCase().includes(q)));
    if (status && status !== 'all') products = products.filter(product => product.status === status);
    products.sort((a, b) => {
      if (sort === 'oldest') return Number(a.createdAt || 0) - Number(b.createdAt || 0);
      if (sort === 'profit') return Number(b.estimatedProfit ?? -Infinity) - Number(a.estimatedProfit ?? -Infinity);
      if (sort === 'low-stock') return Number(a.inventoryQuantity || 0) - Number(b.inventoryQuantity || 0);
      if (sort === 'high-stock') return Number(b.inventoryQuantity || 0) - Number(a.inventoryQuantity || 0);
      if (sort === 'price') return Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0);
      if (sort === 'alpha') return String(a.name).localeCompare(String(b.name));
      return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
    });
    return NextResponse.json({ products, serverTime: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Seller products load failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to load products.') }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const item = productInput(body || {});
    const ref = adminDb.ref(`sellerData/${uid}/products`).push();
    await ref.set(item);
    return NextResponse.json({ success: true, product: normalizeProduct(ref.key || '', item) }, { status: 201 });
  } catch (error) {
    console.error('Seller product create failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to create this product.') }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const id = cleanText(body.id, 160);
    if (!id) return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    const ref = adminDb.ref(`sellerData/${uid}/products/${id}`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const existing = snapshot.val() || {};
    const expectedVersion = asNumber(body.expectedVersion);
    if (expectedVersion !== null && Number(existing.version || 0) !== expectedVersion) {
      return NextResponse.json({ error: 'This product changed on another device. Refresh before saving.', code: 'VERSION_CONFLICT', current: normalizeProduct(id, existing) }, { status: 409 });
    }
    const item = productInput(body || {}, existing);
    await ref.set(item);
    return NextResponse.json({ success: true, product: normalizeProduct(id, item) });
  } catch (error) {
    console.error('Seller product update failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to update this product.') }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const url = new URL(request.url);
    const id = cleanText(url.searchParams.get('id'), 160);
    if (!id) return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    const ref = adminDb.ref(`sellerData/${uid}/products/${id}`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    await ref.remove();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller product delete failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to delete this product.') }, { status: 400 });
  }
}
