import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';
const clean = (value: unknown, max = 160) => String(value ?? '').trim().slice(0, max);
const values = (snapshot: any) => snapshot.exists() ? Object.entries(snapshot.val() as Record<string, any>) : [];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const query = clean(new URL(request.url).searchParams.get('q')).toLowerCase();
    if (query.length < 2) return NextResponse.json({ success: true, results: [] });
    const [applications, suppliers, users, tickets, rooms] = await Promise.all([
      adminDb.ref('sellerApplications').get(), adminDb.ref('suppliers').get(), adminDb.ref('users').get(), adminDb.ref('tickets').get(), adminDb.ref('partnerDealRooms').get(),
    ]);
    const result: any[] = [];
    const add = (category: string, id: string, title: string, subtitle: string, href: string, extra = '') => {
      if (`${id} ${title} ${subtitle} ${extra}`.toLowerCase().includes(query)) result.push({ id: `${category}:${id}`, category, title: title || 'Untitled record', subtitle, href });
    };
    values(applications).forEach(([id, item]: any) => add('Applications', id, item.businessName || item.fullName, `${item.fullName || ''} · ${item.status || 'pending'}`, `/admin/sellers?application=${encodeURIComponent(id)}`, `${item.businessEmail} ${item.personalEmail} ${item.email} ${item.trackingId}`));
    values(suppliers).forEach(([id, item]: any) => add('Suppliers', id, item.companyName, `${item.contactName || ''} · ${item.status || 'new'}`, `/admin/suppliers?submission=${encodeURIComponent(id)}`, `${item.email} ${item.categories}`));
    values(users).forEach(([id, item]: any) => add('Users', id, item.businessName || item.displayName || item.email, `${item.role || 'user'} · ${item.status || 'active'}`, `/admin/users?user=${encodeURIComponent(id)}`, `${item.email} ${item.name}`));
    values(tickets).forEach(([id, item]: any) => add('Tickets', id, item.subject, `${item.name || item.email || ''} · ${item.status || 'open'}`, `/admin/tickets?ticket=${encodeURIComponent(id)}`, `${item.message} ${item.category}`));
    values(rooms).forEach(([id, item]: any) => add('Deal Rooms', id, item.companyName, `${item.contactName || ''} · ${item.status || 'active'}`, `/admin/deal-room?application=${encodeURIComponent(id)}`, `${item.contactEmail}`));
    return NextResponse.json({ success: true, results: result.slice(0, 40) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Search is unavailable.') }, { status: 401 });
  }
}
