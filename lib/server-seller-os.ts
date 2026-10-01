import { adminDb } from '@/lib/firebase-admin';
import { requireSeller } from '@/lib/server-auth';

export type SellerContext = {
  uid: string;
  profile: Record<string, any>;
};

export function cleanText(value: unknown, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

export function asNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function listFromNode<T = Record<string, any>>(value: unknown): Array<T & { id: string }> {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, T>).map(([id, item]) => ({ id, ...(item as T) }));
}

export async function sellerContext(request: Request): Promise<SellerContext> {
  const decoded = await requireSeller(request);
  const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  if (!profileSnapshot.exists()) throw new Error('Seller profile not found.');
  const profile = profileSnapshot.val() || {};
  if (profile.status === 'disabled') throw new Error('Seller access disabled.');
  return { uid: decoded.uid, profile };
}

export function productFinancials(product: Record<string, any>) {
  const sellingPrice = asNumber(product.sellingPrice ?? product.price);
  const cost = asNumber(product.cost);
  const marketplaceFees = asNumber(product.marketplaceFees) ?? 0;
  const fulfillmentFees = asNumber(product.fulfillmentFees ?? product.shippingFees ?? product.fbaFees) ?? 0;
  const estimatedProfit = sellingPrice === null || cost === null
    ? null
    : sellingPrice - cost - marketplaceFees - fulfillmentFees;
  const margin = sellingPrice && estimatedProfit !== null ? (estimatedProfit / sellingPrice) * 100 : null;
  const roi = cost && estimatedProfit !== null ? (estimatedProfit / cost) * 100 : null;
  return {
    sellingPrice,
    cost,
    marketplaceFees,
    fulfillmentFees,
    estimatedProfit,
    margin,
    roi,
  };
}

export function productAttention(product: Record<string, any>) {
  const warnings: string[] = [];
  const inventory = asNumber(product.inventoryQuantity ?? product.inventory);
  const threshold = asNumber(product.lowStockThreshold);
  if (!cleanText(product.sku, 100)) warnings.push('Missing SKU');
  if (!cleanText(product.upc, 100) && !cleanText(product.ean, 100)) warnings.push('Missing UPC/EAN');
  if (asNumber(product.cost) === null) warnings.push('Missing cost');
  if (threshold !== null && inventory !== null && inventory <= threshold) warnings.push('Low stock');
  const status = cleanText(product.status, 40).toLowerCase();
  if (status === 'rejected') warnings.push('Rejected');
  if (cleanText(product.listingError, 1000)) warnings.push('Listing error');
  if (cleanText(product.marketplaceError, 1000)) warnings.push('Marketplace error');
  if (product.reviewRequired === true) warnings.push('Review required');
  return warnings;
}

export function normalizeProduct(id: string, product: Record<string, any>) {
  const financials = productFinancials(product);
  return {
    id,
    ...product,
    name: cleanText(product.name || product.title, 180),
    title: cleanText(product.title || product.name, 180),
    status: cleanText(product.status || 'draft', 40).toLowerCase(),
    inventoryQuantity: asNumber(product.inventoryQuantity ?? product.inventory) ?? 0,
    lowStockThreshold: asNumber(product.lowStockThreshold) ?? 0,
    ...financials,
    attention: productAttention(product),
  };
}

export async function sellerProducts(uid: string) {
  const snapshot = await adminDb.ref(`sellerData/${uid}/products`).get();
  return listFromNode<Record<string, any>>(snapshot.val())
    .map(item => normalizeProduct(item.id, item))
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

export async function sellerTickets(uid: string) {
  const snapshot = await adminDb.ref('tickets').get();
  return listFromNode<Record<string, any>>(snapshot.val())
    .filter(ticket => ticket.sellerUid === uid)
    .map(ticket => ({
      ...ticket,
      messages: listFromNode<Record<string, any>>(ticket.messages).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)),
    }))
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

export async function sellerApplication(profile: Record<string, any>) {
  if (!profile.sellerApplicationId) return null;
  const snapshot = await adminDb.ref(`sellerApplications/${profile.sellerApplicationId}`).get();
  return snapshot.exists() ? { id: profile.sellerApplicationId, ...snapshot.val() } : null;
}

export function verificationSteps(application: Record<string, any> | null, profile: Record<string, any>) {
  const status = cleanText(application?.status || profile.status, 60).toLowerCase();
  const approved = ['approved', 'active'].includes(status) || profile.role === 'seller';
  return [
    { key: 'application', label: 'Application', complete: Boolean(application) || approved },
    { key: 'email', label: 'Email Verification', complete: Boolean(application?.emailVerified || profile.emailVerified || approved) },
    { key: 'documents', label: 'Documents', complete: Boolean(application?.documentsVerified || application?.documentsApproved || approved) },
    { key: 'business', label: 'Business Review', complete: Boolean(application?.businessReviewCompleted || approved) },
    { key: 'seller', label: 'Seller Review', complete: Boolean(application?.sellerReviewCompleted || approved) },
    { key: 'approved', label: 'Approved', complete: approved },
  ];
}

export function sanitizeForAI(value: unknown, depth = 0): unknown {
  if (depth > 5) return undefined;
  if (Array.isArray(value)) return value.slice(0, 40).map(item => sanitizeForAI(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const blocked = /password|token|secret|private.?key|access.?key|authorization|otp|codehash|session/i;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !blocked.test(key))
    .map(([key, item]) => [key, sanitizeForAI(item, depth + 1)]));
}
