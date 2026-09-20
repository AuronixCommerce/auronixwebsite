import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';
const rows = (snapshot: any) => snapshot.exists() ? Object.entries(snapshot.val() as Record<string, any>).map(([id, value]) => ({ id, ...value })) : [];
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
const csv = (headers: string[], data: any[][]) => `\uFEFF${headers.map(csvCell).join(',')}\r\n${data.map(row => row.map(csvCell).join(',')).join('\r\n')}`;

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request); const url = new URL(request.url); const report = url.searchParams.get('report') || 'summary';
    const [applicationsSnapshot, suppliersSnapshot, usersSnapshot, roomsSnapshot] = await Promise.all([adminDb.ref('sellerApplications').get(), adminDb.ref('suppliers').get(), adminDb.ref('users').get(), adminDb.ref('partnerDealRooms').get()]);
    const applications = rows(applicationsSnapshot), suppliers = rows(suppliersSnapshot), users = rows(usersSnapshot), rooms = rows(roomsSnapshot);
    if (report === 'summary') {
      const countBy = (items: any[]) => items.reduce<Record<string, number>>((value, item) => ({ ...value, [item.status || 'unknown']: (value[item.status || 'unknown'] || 0) + 1 }), {});
      return NextResponse.json({ success: true, generatedAt: Date.now(), totals: { applications: applications.length, suppliers: suppliers.length, activePartners: users.filter((item: any) => ['seller', 'partner', 'supplier'].includes(item.role) && item.status !== 'disabled').length, dealRooms: rooms.length }, applicationStatuses: countBy(applications), supplierStatuses: countBy(suppliers) });
    }
    let content = ''; let filename = '';
    if (report === 'applications') {
      content = csv(['Application ID', 'Tracking ID', 'Business', 'Applicant', 'Business email', 'Personal email', 'Status', 'Revision', 'Created', 'Updated'], applications.map((item: any) => [item.id, item.trackingId, item.businessName, item.fullName, item.businessEmail || item.email, item.personalEmail, item.status, item.revision || 0, item.createdAt ? new Date(item.createdAt).toISOString() : '', item.updatedAt ? new Date(item.updatedAt).toISOString() : ''])); filename = 'auronix-applications.csv';
    } else if (report === 'partners') {
      const roomByUid = Object.fromEntries(rooms.map((room: any) => [room.sellerUid, room]));
      content = csv(['Account ID', 'Business', 'Contact', 'Email', 'Role', 'Status', 'Application ID', 'Brands', 'MOQ', 'Pricing model', 'Lead time days', 'Created'], users.filter((item: any) => ['seller', 'partner', 'supplier'].includes(item.role)).map((item: any) => { const room: any = roomByUid[item.id] || {}; return [item.id, item.businessName, item.displayName || item.name, item.email, item.role, item.status, item.sellerApplicationId, room.commercial?.brands, room.commercial?.minimumOrderQuantity, room.commercial?.pricingModel, room.commercial?.leadTimeDays, item.createdAt ? new Date(item.createdAt).toISOString() : '']; })); filename = 'auronix-partners.csv';
    } else if (report === 'suppliers') {
      content = csv(['Submission ID', 'Company', 'Contact', 'Email', 'Phone', 'Country', 'Categories', 'Status', 'Brands', 'MOQ', 'Pricing model', 'Lead time days', 'Created'], suppliers.map((item: any) => [item.id, item.companyName, item.contactName, item.email, item.phone, item.country, item.categories, item.status, item.commercial?.brands, item.commercial?.minimumOrderQuantity, item.commercial?.pricingModel, item.commercial?.leadTimeDays, item.createdAt ? new Date(item.createdAt).toISOString() : ''])); filename = 'auronix-suppliers.csv';
    } else return NextResponse.json({ error: 'Unknown report.' }, { status: 400 });
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'REPORT_EXPORT', targetType: 'report', targetId: report, summary: `${report} CSV exported`, request });
    return new NextResponse(content, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to generate report.') }, { status: 401 }); }
}
