import { adminDb } from '@/lib/firebase-admin';
import type { PartnerCommercialTerms, PartnerFieldChange, PartnerTimelineEvent } from '@/lib/types';

export const EMPTY_COMMERCIAL_TERMS: PartnerCommercialTerms = {
  brands: '',
  minimumOrderQuantity: '',
  pricingModel: '',
  currency: 'USD',
  leadTimeDays: '',
  incoterms: '',
  notes: '',
};

export const APPLICATION_FIELD_LABELS: Record<string, string> = {
  fullName: 'Contact name',
  businessName: 'Business name',
  phone: 'Phone',
  country: 'Country',
  address: 'Address',
  city: 'City',
  state: 'State',
  zipCode: 'Postal code',
  website: 'Website',
  businessType: 'Business type',
  yearsInBusiness: 'Years in business',
  productCategories: 'Product categories',
  businessInformation: 'Business information',
  whyWorkWithAuronix: 'Partnership goals',
  catalogUrl: 'Catalog URL',
};

const text = (value: unknown, max = 5000) => String(value ?? '').trim().slice(0, max);

export function applicationContactEmail(application: any) {
  return text(application?.preferredContactEmail || (application?.preferredContactType === 'personal' ? application?.personalEmail : application?.businessEmail) || application?.email || application?.personalEmail, 320).toLowerCase();
}

export function normalizeCommercial(value: any): PartnerCommercialTerms {
  return {
    brands: text(value?.brands, 1000),
    minimumOrderQuantity: text(value?.minimumOrderQuantity, 120),
    pricingModel: text(value?.pricingModel, 200),
    currency: text(value?.currency || 'USD', 12).toUpperCase(),
    leadTimeDays: text(value?.leadTimeDays, 40),
    incoterms: text(value?.incoterms, 80).toUpperCase(),
    notes: text(value?.notes, 3000),
  };
}

export function applicationChanges(previous: any, next: Record<string, string>): PartnerFieldChange[] {
  return Object.entries(next).flatMap(([field, after]) => {
    const before = text(previous?.[field]);
    const normalizedAfter = text(after);
    if (before === normalizedAfter) return [];
    return [{ field, label: APPLICATION_FIELD_LABELS[field] || field, before, after: normalizedAfter }];
  });
}

export async function ensureDealRoom(applicationId: string, applicationInput?: any) {
  const roomRef = adminDb.ref(`partnerDealRooms/${applicationId}`);
  let application = applicationInput;
  if (!application) {
    const snapshot = await adminDb.ref(`sellerApplications/${applicationId}`).get();
    application = snapshot.exists() ? snapshot.val() : {};
  }
  const now = Date.now();
  const room = {
    applicationId,
    sellerUid: text(application?.sellerUid || application?.accountUid, 160),
    companyName: text(application?.businessName || application?.companyName, 200),
    contactName: text(application?.fullName || application?.contactName, 160),
    contactEmail: applicationContactEmail(application),
    status: text(application?.status || 'pending', 60),
    commercial: normalizeCommercial(application?.commercial),
    documents: {},
    messages: {},
    timeline: {},
    notificationPreferences: { email: true, push: false, whatsapp: false, whatsappPhone: '' },
    createdAt: Number(application?.createdAt || now),
    updatedAt: now,
  };
  const transaction = await roomRef.transaction(current => {
    if (!current) return room;
    return {
      ...current,
      sellerUid: current.sellerUid || room.sellerUid,
      companyName: room.companyName || current.companyName,
      contactName: room.contactName || current.contactName,
      contactEmail: room.contactEmail || current.contactEmail,
      status: room.status || current.status,
      commercial: { ...EMPTY_COMMERCIAL_TERMS, ...(current.commercial || {}) },
      documents: current.documents || {},
      messages: current.messages || {},
      timeline: current.timeline || {},
      notificationPreferences: { ...room.notificationPreferences, ...(current.notificationPreferences || {}) },
      updatedAt: now,
    };
  });
  const value = transaction.snapshot.val() || room;
  if (!value.timeline || Object.keys(value.timeline).length === 0) {
    await appendDealRoomTimeline(applicationId, {
      type: 'created',
      title: 'Partner record opened',
      description: 'The application and its commercial review workspace were connected.',
      actorRole: 'system',
    });
  }
  return (await roomRef.get()).val();
}

export async function appendDealRoomTimeline(applicationId: string, event: Omit<PartnerTimelineEvent, 'id' | 'createdAt'> & { createdAt?: number }) {
  const ref = adminDb.ref(`partnerDealRooms/${applicationId}/timeline`).push();
  const value: PartnerTimelineEvent = { ...event, id: String(ref.key), createdAt: event.createdAt || Date.now() };
  await Promise.all([
    ref.set(value),
    adminDb.ref(`partnerDealRooms/${applicationId}`).update({ updatedAt: Date.now() }),
  ]);
  return value;
}

export async function linkSellerToDealRoom(applicationId: string, sellerUid: string) {
  await ensureDealRoom(applicationId);
  await adminDb.ref(`partnerDealRooms/${applicationId}`).update({ sellerUid, updatedAt: Date.now() });
  await appendDealRoomTimeline(applicationId, {
    type: 'account',
    title: 'Seller workspace connected',
    description: 'The approved account can now access this Deal Room.',
    actorRole: 'system',
  });
}

export function roomForClient(room: any) {
  if (!room) return null;
  const list = (value: any) => Object.entries(value || {}).map(([id, item]) => ({ ...(item as object), id }));
  return {
    ...room,
    commercial: normalizeCommercial(room.commercial),
    documents: list(room.documents).sort((a: any, b: any) => Number(b.uploadedAt || 0) - Number(a.uploadedAt || 0)),
    messages: list(room.messages).sort((a: any, b: any) => Number(a.createdAt || 0) - Number(b.createdAt || 0)),
    timeline: list(room.timeline).sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
    notificationPreferences: { email: true, push: false, whatsapp: false, whatsappPhone: '', ...(room.notificationPreferences || {}) },
  };
}
