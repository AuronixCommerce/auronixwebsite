import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';
const entries = (snapshot: any, source: string) => snapshot.exists() ? Object.entries(snapshot.val() as Record<string, any>).map(([id, value]) => ({ ...value, id: `${source}:${id}`, source })) : [];
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [audit, operations, errors, sessions] = await Promise.all([adminDb.ref('adminAuditLogs').get(), adminDb.ref('siteOperationsAudit').get(), adminDb.ref('operationalErrors').get(), adminDb.ref('adminSessions').get()]);
    const activity = [
      ...entries(audit, 'admin').map((item: any) => ({ ...item, severity: 'info' })),
      ...entries(operations, 'operations').map((item: any) => ({ ...item, action: item.action || 'SITE_OPERATION', actorEmail: item.updatedBy || 'system', targetType: item.targetType || 'siteOperation', summary: item.summary || item.reason || item.path || '', severity: item.severity || 'info' })),
      ...entries(errors, 'errors').map((item: any) => ({ ...item, action: 'OPERATIONAL_ERROR', actorEmail: 'system', targetType: item.scope || 'runtime', summary: item.message || '', severity: item.status === 'resolved' ? 'info' : 'high' })),
      ...entries(sessions, 'security').map((item: any) => ({ ...item, action: 'ADMIN_SESSION', actorEmail: item.email || item.adminEmail || '', targetType: 'adminSession', targetId: item.uid || item.id, summary: item.revokedAt ? 'Session revoked' : 'Verified administrative session', createdAt: item.createdAt || item.verifiedAt || item.updatedAt, severity: item.revokedAt ? 'medium' : 'info' })),
    ].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 2000);
    return NextResponse.json({ success: true, activity, counts: activity.reduce<Record<string, number>>((value, item) => ({ ...value, [item.source]: (value[item.source] || 0) + 1 }), {}) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ error: userFacingError(error, 'Unable to load activity history.') }, { status: 401 }); }
}
