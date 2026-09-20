import { adminDb } from '@/lib/firebase-admin';
import { ensureDealRoom, appendDealRoomTimeline, applicationContactEmail } from '@/lib/deal-room';
import { sendProfessionalEmail } from '@/lib/server-mail';
import { sendSellerPush } from '@/lib/server-push';
import { sendWhatsAppStatus } from '@/lib/server-whatsapp-status';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auronixcommerce.com').replace(/\/$/, '');
const safe = (value: unknown, max = 2000) => String(value ?? '').trim().slice(0, max);

async function deliveryRecord(input: { applicationId: string; recipient: string; subject: string; event: string }) {
  const ref = adminDb.ref('emailDeliveryLogs').push();
  const now = Date.now();
  const base = { id: ref.key, ...input, status: 'queued', createdAt: now, updatedAt: now };
  await ref.set(base);
  return { ref, base };
}

export async function notifyPartner(input: { applicationId: string; title: string; body: string; event: string; href?: string }) {
  const applicationSnapshot = await adminDb.ref(`sellerApplications/${input.applicationId}`).get();
  const application = applicationSnapshot.exists() ? applicationSnapshot.val() : {};
  const room = await ensureDealRoom(input.applicationId, application);
  const preferences = { email: true, push: false, whatsapp: false, whatsappPhone: '', ...(room?.notificationPreferences || {}) };
  const recipient = safe(room?.contactEmail || applicationContactEmail(application), 320).toLowerCase();
  const href = input.href || '/seller/deal-room';
  let emailSent = false;
  if (preferences.email !== false && recipient) {
    const delivery = await deliveryRecord({ applicationId: input.applicationId, recipient, subject: input.title, event: input.event });
    try {
      const info: any = await sendProfessionalEmail({
        to: recipient,
        name: room?.contactName || application?.fullName,
        subject: input.title,
        body: `${input.body}\n\nOpen your secure Auronix workspace: ${siteUrl}${href}`,
      }, 'notification');
      await delivery.ref.update({ status: 'sent', providerMessageId: safe(info?.messageId, 500), updatedAt: Date.now() });
      emailSent = true;
    } catch (error) {
      await delivery.ref.update({ status: 'failed', error: safe(error instanceof Error ? error.message : error), updatedAt: Date.now() });
    }
  }
  if (room?.sellerUid) {
    const notification = adminDb.ref(`sellerNotifications/${room.sellerUid}`).push();
    await notification.set({ id: notification.key, type: input.event, title: input.title, message: input.body, href, createdAt: Date.now() });
    if (preferences.push) await sendSellerPush(room.sellerUid, { title: input.title, body: input.body, href }).catch(() => undefined);
  }
  if (preferences.whatsapp && preferences.whatsappPhone) {
    await sendWhatsAppStatus({ phone: preferences.whatsappPhone, templateParameters: [room?.contactName || 'Partner', input.title, input.body] }).catch(() => undefined);
  }
  await appendDealRoomTimeline(input.applicationId, {
    type: 'notification',
    title: input.title,
    description: emailSent ? 'Email and workspace notification recorded.' : 'Workspace notification recorded; email delivery needs attention.',
    actorRole: 'system',
  });
  return { emailSent };
}
