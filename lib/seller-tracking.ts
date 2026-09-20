import { createHash, randomBytes } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { sendProfessionalEmail } from '@/lib/server-mail';
export const trackingHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const createTrackingId = () => `AX-T-${randomBytes(12).toString('hex').toUpperCase()}`;
export const TRACKING_PATH = '/seller/application/track';
export function trackingView(value: any) {
  const fields = ['fullName','businessName','phone','country','address','city','state','zipCode','website','businessType','yearsInBusiness','productCategories','businessInformation','whyWorkWithAuronix','catalogUrl'];
  return { trackingId: value.trackingId || value.id, status: value.status || 'pending', createdAt: value.createdAt, updatedAt: value.updatedAt, reviewMessage: String(value.reviewMessage || ''), requestedFields: Array.isArray(value.requestedFields) ? value.requestedFields : [], revision: Number(value.revision || 1), canEdit: ['pending','changes_requested'].includes(value.status || 'pending'), form: Object.fromEntries(fields.map(key => [key, String(value[key] || '')])) };
}
export async function notifySellerApplication(applicationId: string, application: any, subject: string, body: string) {
  const email = String(application.preferredContactEmail || (application.preferredContactType === 'personal' ? application.personalEmail : application.businessEmail) || application.email || '').trim();
  if (!email) return false;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auronixcommerce.com').replace(/\/$/, '');
  try {
    await sendProfessionalEmail({ to: email, name: application.fullName, subject, body: `${body}\n\nTracking ID: ${application.trackingId || applicationId}\nTrack your application: ${site}${TRACKING_PATH}\n\nUse an email address from your application and verify the emailed code to view your progress. Never share verification codes.` });
    await adminDb.ref(`sellerApplications/${applicationId}`).update({ lastNotificationAt: Date.now(), notificationPending: false });
    return true;
  } catch (error) {
    console.error('Application notification delivery failed', error);
    await adminDb.ref(`sellerApplications/${applicationId}`).update({ notificationPending: true }).catch(() => undefined);
    return false;
  }
}
