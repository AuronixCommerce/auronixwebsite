export interface DatabaseError {
  message: string;
  code?: string;
}

export interface TimestampedRecord {
  createdAt: number;
  updatedAt: number;
}

export interface SupplierSubmission extends TimestampedRecord {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  country?: string;
  categories?: string;
  yearsInBusiness?: string;
  distributionModel?: string;
  catalogUrl?: string;
  message?: string;
  status: SupplierStatus;
}

export type SupplierStatus =
  | 'new'
  | 'reviewing'
  | 'contacted'
  | 'approved'
  | 'rejected'
  | 'archived';

export interface ContactMessage extends TimestampedRecord {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  category: ContactCategory;
  message: string;
  status: ContactMessageStatus;
}

export type ContactCategory =
  | 'Supplier Partnership'
  | 'Brand Partnership'
  | 'Wholesale'
  | 'Marketplace'
  | 'General Inquiry'
  | 'Support';

export type ContactMessageStatus =
  | 'new'
  | 'reviewing'
  | 'resolved'
  | 'archived';

export interface SupportTicket extends TimestampedRecord {
  name: string;
  email: string;
  sellerUid?: string;
  sellerEmail?: string;
  category: string;
  subject: string;
  message: string;
  status: TicketStatus;
  lastResponse?: string;
  respondedAt?: number;
}

export type TicketStatus =
  | 'open'
  | 'in-progress'
  | 'resolved'
  | 'closed';

export interface BlogPost extends TimestampedRecord {
  title: string;
  slug: string;
  summary: string;
  content: string;
  author: string;
  image?: string;
  category: string;
  published: boolean;
  publishedAt?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface FAQ extends TimestampedRecord {
  question: string;
  answer: string;
  category: string;
  order: number;
  active: boolean;
}

export interface JobPosting extends TimestampedRecord {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  requirements: string;
  applicationInstructions: string;
  status: 'active' | 'closed';
}

export interface Partner extends TimestampedRecord {
  name: string;
  category: PartnerCategory;
  description?: string;
  website?: string;
  logoUrl?: string;
  active: boolean;
}

export type PartnerCategory =
  | 'Brands'
  | 'Manufacturers'
  | 'Distributors'
  | 'Wholesalers'
  | 'Suppliers'
  | 'Marketplace Businesses';

export interface LegalContent extends TimestampedRecord {
  title: string;
  lastUpdated: number;
  sections: LegalSection[];
}

export interface LegalSection {
  heading: string;
  body: string;
}

export interface CompanySettings extends TimestampedRecord {
  companyName: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  footerText: string;
  socialUrls: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  seoDefaults: {
    title: string;
    description: string;
  };
  businessInfo: {
    legalName: string;
    entityType: string;
    state: string;
    description: string;
  };
  legalDates: {
    privacyUpdated: number;
    termsUpdated: number;
    disclaimerUpdated: number;
    cookiePolicyUpdated: number;
  };
}

export interface UserProfile extends TimestampedRecord {
  uid: string;
  email: string;
  displayName?: string;
  role:
    | 'admin'
    | 'seller'
    | 'support'
    | 'partner'
    | 'supplier'
    | 'user';

  sellerApplicationId?: string;
  businessName?: string;
  name?: string;
  phone?: string;
  website?: string;
  status?: string;
  partnerId?: string;

  banned?: boolean;
  bannedUntil?: number | null;
  banReason?: string;
  bannedAt?: number | null;
  deletedAt?: number;
}

export interface SellerApplication extends TimestampedRecord {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  country: string;
  website?: string;
  businessType: string;
  productCategories: string;
  yearsInBusiness: string;
  businessInformation?: string;
  reason?: string;
  catalogUrl?: string;

  status: SellerApplicationStatus;

  invitationToken?: string;
  invitationTokenHash?: string;
  invitationExpires?: number | null;
  invitationUsedAt?: number | null;
}

export type SellerApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'invited'
  | 'active'
  | 'suspended'
  | 'archived';

export interface ChatLead extends TimestampedRecord {
  name: string;
  email: string;
  phone?: string;
  inquiry: string;
  summary?: string;
  conversationId?: string;
  status: 'new' | 'contacted' | 'archived';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatConversation extends TimestampedRecord {
  messages: Record<string, ChatMessage>;
  leadCaptured?: boolean;
  sellerUid?: string;
}

export interface AISettings extends TimestampedRecord {
  chatEnabled: boolean;
  ticketAssistantEnabled: boolean;
  autoResponseEnabled: boolean;
  model: string;
  maxResponseLength: number;
  welcomeMessage: string;
  supportContext: string;
  systemInstructions: string;
}

export interface PartnerPortalData extends TimestampedRecord {
  partnerId: string;
  overview: string;
  status: string;
  documents: {
    name: string;
    url: string;
    uploadedAt: number;
  }[];
  catalogs: {
    name: string;
    url: string;
    uploadedAt: number;
  }[];
  requests: {
    subject: string;
    message: string;
    status: string;
    createdAt: number;
  }[];
  resources: {
    title: string;
    url: string;
    description: string;
  }[];
}

export interface CompanyInfo extends TimestampedRecord {
  companyName: string;
  tagline: string;
  publicEmail: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  businessAddress: string;
  country: string;
  website: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  x: string;
  footerDescription: string;
  legalName: string;
}