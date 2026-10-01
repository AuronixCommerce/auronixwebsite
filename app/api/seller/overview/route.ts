import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  listFromNode,
  productAttention,
  productFinancials,
  sellerApplication,
  sellerContext,
  sellerProducts,
  sellerTickets,
  verificationSteps,
} from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { uid, profile } = await sellerContext(request);
    const [products, tickets, application, catalogsSnapshot, notificationsSnapshot, analyticsSnapshot, documentsSnapshot] = await Promise.all([
      sellerProducts(uid),
      sellerTickets(uid),
      sellerApplication(profile),
      adminDb.ref(`sellerData/${uid}/catalogs`).get(),
      adminDb.ref(`sellerNotifications/${uid}`).get(),
      adminDb.ref(`sellerAnalytics/${uid}`).get(),
      adminDb.ref(`sellerDocuments/${uid}`).get(),
    ]);

    const catalogs = listFromNode<Record<string, any>>(catalogsSnapshot.val())
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
    const notifications = listFromNode<Record<string, any>>(notificationsSnapshot.val())
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    const documents = listFromNode<Record<string, any>>(documentsSnapshot.val());
    const analytics = analyticsSnapshot.exists() ? analyticsSnapshot.val() : null;

    const activeProducts = products.filter(product => product.status === 'active').length;
    const attention = products
      .map(product => ({ ...product, attention: productAttention(product) }))
      .filter(product => product.attention.length > 0)
      .slice(0, 8);
    const openTickets = tickets.filter(ticket => !['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase()));
    const processingCatalogs = catalogs.filter(catalog => ['uploading', 'uploaded', 'processing', 'needs-review'].includes(String(catalog.status || '').toLowerCase()));

    const inventoryProducts = products.filter(product => productFinancials(product).cost !== null);
    const inventoryValue = inventoryProducts.length
      ? inventoryProducts.reduce((sum, product) => {
          const cost = productFinancials(product).cost || 0;
          return sum + cost * Number(product.inventoryQuantity || 0);
        }, 0)
      : null;

    const series = Array.isArray(analytics?.series)
      ? analytics.series.slice(-90)
      : analytics?.series && typeof analytics.series === 'object'
        ? Object.values(analytics.series).slice(-90)
        : [];

    const financial = {
      revenue: typeof analytics?.revenue === 'number' ? analytics.revenue : null,
      sales: typeof analytics?.sales === 'number' ? analytics.sales : null,
      profit: typeof analytics?.profit === 'number' ? analytics.profit : null,
      inventoryValue,
      series,
      available: Boolean(analytics),
    };

    return NextResponse.json({
      serverTime: Date.now(),
      profile,
      application,
      verification: verificationSteps(application, profile),
      summary: {
        ...financial,
        activeProducts,
        productCount: products.length,
        openTickets: openTickets.length,
        catalogsProcessing: processingCatalogs.length,
        productsNeedingAttention: attention.length,
        documentCount: documents.length,
      },
      productsNeedingAttention: attention,
      openTickets: openTickets.slice(0, 5),
      latestUpdates: notifications.slice(0, 8),
      recentCatalogs: catalogs.slice(0, 5),
      dataAvailability: {
        analytics: Boolean(analytics),
        inventoryValue: inventoryValue !== null,
        documents: documentsSnapshot.exists(),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Seller overview failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to load your seller overview.') }, { status: 401 });
  }
}
