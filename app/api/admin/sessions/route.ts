import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { writeAuditLog } from '@/lib/server-audit';
export async function GET(request: Request) { try { const admin = await requireAdmin(request); const snapshot = await adminDb.ref(`adminSessions/${admin.uid}`).get(); return NextResponse.json({ success: true, sessions: snapshot.val() || {} }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? userFacingError(error) : 'Unable to load sessions.' }, { status: 403 }); } }
export async function POST(request: Request) { try { const admin = await requireAdmin(request); const body = await request.json(); const id = String(body?.id || ''); if (!id) return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 }); await adminDb.ref(`adminSessions/${admin.uid}/${id}`).update({ revokedAt: Date.now(), revokedBy: admin.uid }); await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email || '', action: 'ADMIN_SESSION_REVOKED', targetType: 'adminSession', targetId: id, request }); return NextResponse.json({ success: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? userFacingError(error) : 'Unable to revoke session.' }, { status: 403 }); } }
