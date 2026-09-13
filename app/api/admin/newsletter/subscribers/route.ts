import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { writeAuditLog } from '@/lib/server-audit';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const id = String(body?.id || '').trim();
    const action = String(body?.action || '').trim();
    if (!id || !['resubscribe', 'suppress', 'unsuppress'].includes(action)) return NextResponse.json({ error: 'A valid subscriber and action are required.' }, { status: 400 });
    const ref = adminDb.ref(`newsletterSubscribers/${id}`);
    const record = (await ref.get()).val();
    if (!record) return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 });
    const now = Date.now();
    const updates = action === 'resubscribe' ? { active: true, suppressed: false, suppressionReason: null, pendingConfirmation: false, resubscribedAt: now, updatedAt: now } : action === 'suppress' ? { active: false, suppressed: true, suppressionReason: 'manual_admin', suppressedAt: now, updatedAt: now } : { suppressed: false, suppressionReason: null, updatedAt: now };
    await ref.update(updates);
    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email || '', action: `NEWSLETTER_SUBSCRIBER_${action.toUpperCase()}`, targetType: 'newsletterSubscriber', targetId: id, summary: `${action} ${record.email || 'subscriber'}`, request });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? userFacingError(error) : 'Unable to update subscriber.' }, { status: 403 });
  }
}
