import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getPrivateObject } from '@/lib/server-r2';
import { generateGroqResponse } from '@/lib/server-groq';
import { cleanText, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function jsonFromAi(value: string) {
  const cleaned = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');
  if (firstArray < 0 || lastArray <= firstArray) throw new Error('Catalog analysis returned an invalid result.');
  const parsed = JSON.parse(cleaned.slice(firstArray, lastArray + 1));
  if (!Array.isArray(parsed)) throw new Error('Catalog analysis returned an invalid result.');
  return parsed.slice(0, 40);
}

const numberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export async function POST(request: Request) {
  let failurePath = '';
  try {
    const { uid } = await sellerContext(request);
    const body = await request.json();
    const id = cleanText(body.id, 160);
    if (!id) return NextResponse.json({ error: 'Catalog ID is required.' }, { status: 400 });

    failurePath = `sellerData/${uid}/catalogs/${id}`;
    const ref = adminDb.ref(failurePath);
    const snapshot = await ref.get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Catalog not found.' }, { status: 404 });
    const catalog = snapshot.val() || {};
    const fileName = cleanText(catalog.originalName || catalog.name, 220);
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (extension !== 'csv') {
      await ref.update({ aiStatus: 'needs-csv', status: 'needs-review', analysisMessage: 'Automated extraction currently supports CSV catalogs. Keep this file stored privately or upload a CSV export for analysis.', updatedAt: Date.now() });
      return NextResponse.json({ error: 'Automated catalog analysis currently supports CSV files. Upload a CSV export of this catalog to analyze product rows.', code: 'CSV_REQUIRED' }, { status: 422 });
    }
    if (!catalog.storageKey) return NextResponse.json({ error: 'Catalog file is unavailable.' }, { status: 409 });

    await ref.update({ aiStatus: 'processing', status: 'processing', analysisStartedAt: Date.now(), updatedAt: Date.now() });
    const stored = await getPrivateObject(String(catalog.storageKey));
    const text = stored.body.toString('utf8').replace(/^\uFEFF/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('This CSV does not contain enough rows to analyze.');

    const sample = rows.slice(0, 121);
    const header = sample[0];
    const records = sample.slice(1).map(values => Object.fromEntries(header.map((key, column) => [key || `column_${column + 1}`, values[column] || ''])));
    const prompt = `Analyze this supplier catalog sample for a seller workspace. Return ONLY a JSON array, maximum 30 objects. Never invent marketplace demand, Amazon rank, buy box, fees, selling price, profitability, approvals, or sales data that is not present in the catalog. Each object may contain: productName, sku, upc, brand, category, supplierCost, suggestedSellingPrice, estimatedFees, estimatedProfit, roi, riskFlags, marketplace, source, status. Use null for unavailable numeric values. source must be "catalog-only" unless marketplace evidence is actually in the supplied rows. riskFlags should identify only concrete catalog-data issues such as missing identifiers, missing cost, missing brand, duplicate-looking rows, or incomplete fields.\n\nCatalog: ${cleanText(catalog.name, 180)}\nSupplier: ${cleanText(catalog.supplier, 180) || 'Not recorded'}\nHeaders: ${JSON.stringify(header)}\nRows: ${JSON.stringify(records).slice(0, 42000)}`;
    const response = await generateGroqResponse('You are Auronix Intelligence catalog analysis. Be conservative, structured, and never manufacture marketplace facts.', prompt, 2600);
    const raw = jsonFromAi(response);
    const now = Date.now();
    const opportunities = raw.map((item: any, index: number) => ({
      id: `${id}-${index + 1}`,
      catalogId: id,
      productName: cleanText(item?.productName, 220) || `Catalog row ${index + 1}`,
      sku: cleanText(item?.sku, 100),
      upc: cleanText(item?.upc, 60),
      brand: cleanText(item?.brand, 120),
      category: cleanText(item?.category, 160),
      supplierCost: numberOrNull(item?.supplierCost),
      suggestedSellingPrice: numberOrNull(item?.suggestedSellingPrice),
      estimatedFees: numberOrNull(item?.estimatedFees),
      estimatedProfit: numberOrNull(item?.estimatedProfit),
      roi: numberOrNull(item?.roi),
      riskFlags: Array.isArray(item?.riskFlags) ? item.riskFlags.map((value: unknown) => cleanText(value, 180)).filter(Boolean).slice(0, 8) : [],
      marketplace: cleanText(item?.marketplace, 80),
      source: item?.source === 'marketplace-data' ? 'marketplace-data' : 'catalog-only',
      status: cleanText(item?.status, 60) || 'review',
      createdAt: now,
    }));

    await adminDb.ref(`sellerData/${uid}/opportunities/${id}`).set(Object.fromEntries(opportunities.map(item => [item.id, item])));
    await ref.update({ aiStatus: 'analyzed', status: 'analyzed', itemCount: Math.max(0, rows.length - 1), analyzedSampleCount: records.length, opportunityCount: opportunities.length, analyzedAt: now, updatedAt: now, analysisMessage: '' });
    const notification = adminDb.ref(`sellerNotifications/${uid}`).push();
    await notification.set({ id: notification.key, type: 'catalog-analysis', title: 'Catalog analysis ready', message: `${catalog.name || 'Your catalog'} produced ${opportunities.length} review opportunities from the analyzed CSV rows.`, catalogId: id, href: '/catalog-opportunities', createdAt: now });
    return NextResponse.json({ success: true, opportunities, itemCount: Math.max(0, rows.length - 1), analyzedSampleCount: records.length });
  } catch (error) {
    console.error('Seller catalog analysis failed:', error);
    if (failurePath) await adminDb.ref(failurePath).update({ aiStatus: 'failed', status: 'needs-review', updatedAt: Date.now() }).catch(() => undefined);
    return NextResponse.json({ error: userFacingError(error, 'Unable to analyze this catalog.') }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const url = new URL(request.url);
    const catalogId = cleanText(url.searchParams.get('catalogId'), 160);
    const snapshot = await adminDb.ref(`sellerData/${uid}/opportunities${catalogId ? `/${catalogId}` : ''}`).get();
    const value = snapshot.val() || {};
    const opportunities: any[] = [];
    const collect = (node: any) => {
      if (!node || typeof node !== 'object') return;
      for (const item of Object.values(node)) {
        if (item && typeof item === 'object' && 'productName' in (item as any)) opportunities.push(item);
        else collect(item);
      }
    };
    collect(value);
    opportunities.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return NextResponse.json({ opportunities, serverTime: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load catalog opportunities.') }, { status: 401 });
  }
}
