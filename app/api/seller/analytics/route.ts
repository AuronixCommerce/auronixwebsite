import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { productFinancials, sellerContext, sellerProducts } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const [analyticsSnapshot, products] = await Promise.all([
      adminDb.ref(`sellerAnalytics/${uid}`).get(),
      sellerProducts(uid),
    ]);
    const raw = analyticsSnapshot.exists() ? analyticsSnapshot.val() || {} : {};
    const inventoryProducts = products.filter(product => productFinancials(product).cost !== null);
    const inventoryValue = inventoryProducts.length ? inventoryProducts.reduce((sum, product) => sum + Number(product.cost || 0) * Number(product.inventoryQuantity || 0), 0) : null;
    const margins = products.map(product => product.margin).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const series = Array.isArray(raw.series) ? raw.series : raw.series && typeof raw.series === 'object' ? Object.values(raw.series) : [];
    return NextResponse.json({
      available: analyticsSnapshot.exists(),
      metrics: {
        revenue: typeof raw.revenue === 'number' ? raw.revenue : null,
        profit: typeof raw.profit === 'number' ? raw.profit : null,
        orders: typeof raw.orders === 'number' ? raw.orders : null,
        sales: typeof raw.sales === 'number' ? raw.sales : null,
        inventoryValue,
        averageMargin: margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null,
        sellThrough: typeof raw.sellThrough === 'number' ? raw.sellThrough : null,
      },
      series: series.slice(-365),
      productPerformance: {
        mostProfitable: [...products].filter(item => typeof item.estimatedProfit === 'number').sort((a, b) => Number(b.estimatedProfit) - Number(a.estimatedProfit)).slice(0, 5),
        lowestStock: [...products].sort((a, b) => Number(a.inventoryQuantity || 0) - Number(b.inventoryQuantity || 0)).slice(0, 5),
        needsAttention: products.filter(item => item.attention?.length).slice(0, 8),
      },
      source: analyticsSnapshot.exists() ? 'seller-analytics' : 'product-records-only',
      serverTime: Date.now(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load seller analytics.') }, { status: 401 });
  }
}
