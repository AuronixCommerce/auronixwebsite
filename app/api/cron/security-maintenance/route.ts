import { createHash, createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { reportOperationalError } from '@/lib/server-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request) { const secret = process.env.CRON_SECRET?.trim(); return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`); }
const object = (value: unknown) => value && typeof value === 'object' ? value as Record<string, any> : {};

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const now = Date.now();
  const removed: Record<string, number> = {};
  try {
    const [draftsSnap, requestsSnap, confirmationsSnap, tokenIndexSnap, rateSnap, sessionsSnap, applicationsSnap, dealRoomsSnap, suppliersSnap] = await Promise.all([
      adminDb.ref('sellerApplicationDrafts').get(), adminDb.ref('newsletterUnsubscribeRequests').get(), adminDb.ref('newsletterConfirmationIndex').get(), adminDb.ref('newsletterUnsubscribeTokenIndex').get(), adminDb.ref('securityRateLimits').get(), adminDb.ref('adminSessions').get(), adminDb.ref('sellerApplications').get(), adminDb.ref('partnerDealRooms').get(), adminDb.ref('suppliers').get(),
    ]);
    const updates: Record<string, null | string | number | boolean> = {};
    for (const [id, item] of Object.entries(object(draftsSnap.val()))) if (Number(item.expiresAt || 0) && Number(item.expiresAt) < now) { updates[`sellerApplicationDrafts/${id}`] = null; if (item.resumeCodeHash) updates[`sellerApplicationResumeIndex/${item.resumeCodeHash}`] = null; removed.sellerDrafts = (removed.sellerDrafts || 0) + 1; }
    for (const [id, item] of Object.entries(object(requestsSnap.val()))) if (Number(item.expiresAt || 0) < now || (item.status === 'completed' && Number(item.completedAt || 0) < now - 7 * 86400000)) { updates[`newsletterUnsubscribeRequests/${id}`] = null; if (item.tokenHash) updates[`newsletterUnsubscribeTokenIndex/${item.tokenHash}`] = null; removed.unsubscribeRequests = (removed.unsubscribeRequests || 0) + 1; }
    for (const [id, item] of Object.entries(object(confirmationsSnap.val()))) if (Number(item.expiresAt || 0) < now) { updates[`newsletterConfirmationIndex/${id}`] = null; removed.confirmations = (removed.confirmations || 0) + 1; }
    for (const [id, item] of Object.entries(object(tokenIndexSnap.val()))) if (Number(item.expiresAt || 0) < now) updates[`newsletterUnsubscribeTokenIndex/${id}`] = null;
    for (const [scope, buckets] of Object.entries(object(rateSnap.val()))) for (const [bucket, entries] of Object.entries(object(buckets))) { const allExpired = Object.values(object(entries)).every(item => Number(item.expiresAt || 0) < now); if (allExpired) { updates[`securityRateLimits/${scope}/${bucket}`] = null; removed.rateBuckets = (removed.rateBuckets || 0) + 1; } }
    for (const [uid, sessions] of Object.entries(object(sessionsSnap.val()))) for (const [id, session] of Object.entries(object(sessions))) if (Number(session.expiresAt || 0) < now || Number(session.revokedAt || 0)) { updates[`adminSessions/${uid}/${id}`] = null; removed.adminSessions = (removed.adminSessions || 0) + 1; }
    for (const [id, application] of Object.entries(object(applicationsSnap.val()))) if (application.invitationTokenHash && Number(application.invitationExpires || 0) < now) { updates[`sellerApplications/${id}/invitationTokenHash`] = null; updates[`sellerApplications/${id}/invitationExpires`] = null; updates[`sellerApplications/${id}/accountCreationStatus`] = 'expired'; updates[`sellerApplications/${id}/updatedAt`] = now; removed.sellerInvitations = (removed.sellerInvitations || 0) + 1; }
    for (const [applicationId, room] of Object.entries(object(dealRoomsSnap.val()))) for (const [documentId, document] of Object.entries(object(room.documents))) if (document.status === 'approved' && Number(document.expiresAt || 0) > 0 && Number(document.expiresAt) < now) { updates[`partnerDealRooms/${applicationId}/documents/${documentId}/status`] = 'expired'; updates[`partnerDealRooms/${applicationId}/documents/${documentId}/reviewedAt`] = now; updates[`partnerDealRooms/${applicationId}/updatedAt`] = now; removed.expiredPartnerDocuments = (removed.expiredPartnerDocuments || 0) + 1; }
    for (const [supplierId, supplier] of Object.entries(object(suppliersSnap.val()))) for (const [documentId, document] of Object.entries(object(supplier.documents))) if (document.status === 'approved' && Number(document.expiresAt || 0) > 0 && Number(document.expiresAt) < now) { updates[`suppliers/${supplierId}/documents/${documentId}/status`] = 'expired'; updates[`suppliers/${supplierId}/documents/${documentId}/reviewedAt`] = now; updates[`suppliers/${supplierId}/updatedAt`] = now; removed.expiredSupplierDocuments = (removed.expiredSupplierDocuments || 0) + 1; }
    if (Object.keys(updates).length) await adminDb.ref().update(updates);

    const backupNodes = ['newsletterSubscribers', 'newsletterCampaigns', 'sellerApplications', 'supplierApplications', 'users', 'site', 'legal', 'faqs', 'blogPosts', 'careers'];
    const backup: Record<string, unknown> = { schemaVersion: 1, createdAt: now, source: 'auronix-firebase-rtdb' };
    for (const node of backupNodes) backup[node] = (await adminDb.ref(node).get()).val() || null;
    const serialized = JSON.stringify(backup);
    const restored = JSON.parse(serialized) as Record<string, unknown>;
    const checksum = createHash('sha256').update(serialized).digest('hex');
    const recoveryCheck = { validJson: Boolean(restored && restored.schemaVersion === 1), requiredNodesPresent: ['users', 'site', 'newsletterSubscribers'].every(node => node in restored), checksum, checksumVerified: createHash('sha256').update(JSON.stringify(restored)).digest('hex') === checksum, bytes: Buffer.byteLength(serialized), recordCounts: Object.fromEntries(backupNodes.map(node => [node, Object.keys(object(restored[node])).length])) };
    const webhook = process.env.DATABASE_BACKUP_WEBHOOK_URL?.trim();
    let externalBackup = 'not_configured';
    if (webhook) { const signature = createHmac('sha256', process.env.DATABASE_BACKUP_SECRET || process.env.CRON_SECRET || '').update(serialized).digest('hex'); const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auronix-Backup-Signature': signature, 'X-Auronix-Backup-Checksum': checksum }, body: serialized }); if (!response.ok) throw new Error(`Backup destination returned HTTP ${response.status}.`); externalBackup = 'uploaded'; }
    const manifestRef = adminDb.ref('backupManifests').push();
    await manifestRef.set({ id: manifestRef.key, createdAt: now, externalBackup, ...recoveryCheck, cleanup: removed });
    return NextResponse.json({ success: true, cleanup: removed, backup: { externalBackup, ...recoveryCheck } });
  } catch (error) {
    await reportOperationalError('security-maintenance-cron', error, { removed });
    return NextResponse.json({ error: 'Security maintenance failed.' }, { status: 500 });
  }
}
