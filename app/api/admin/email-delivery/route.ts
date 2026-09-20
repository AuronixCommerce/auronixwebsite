import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { verifyMailConnection } from '@/lib/server-mail';
import { writeAuditLog } from '@/lib/server-audit';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';
const list = (snapshot: any) => snapshot.exists() ? Object.entries(snapshot.val() as Record<string, any>).map(([id, item]) => ({ ...item, id })) : [];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [deliverySnapshot, eventSnapshot] = await Promise.all([adminDb.ref('emailDeliveryLogs').get(), adminDb.ref('newsletterDeliveryEvents').get()]);
    const deliveries = list(deliverySnapshot).sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 500);
    const events = list(eventSnapshot).sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 300);
    const stats = deliveries.reduce<Record<string, number>>((value, item: any) => ({ ...value, [item.status || 'unknown']: (value[item.status || 'unknown'] || 0) + 1 }), {});
    return NextResponse.json({ success: true, deliveries, events, stats }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to load email delivery.') }, { status: 401 }); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request); const body = await request.json();
    if (body.action !== 'test-connection') return NextResponse.json({ error: 'Unsupported email action.' }, { status: 400 });
    await verifyMailConnection();
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'EMAIL_CONNECTION_TEST', targetType: 'emailService', summary: 'Transactional email connection verified.', request });
    return NextResponse.json({ success: true, checkedAt: Date.now() });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Email service check failed.') }, { status: 503 }); }
}
