import { notifySellerApplication } from '@/lib/seller-tracking';
import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { generateGroqResponse } from '@/lib/server-groq';
import { sendSellerInvitationEmail } from '@/lib/server-mail';
import { issueSellerInvitation } from '@/lib/server-seller-invitations';

type ScreeningLabel =
  | 'AI_APPROVED'
  | 'LOOKS_GOOD'
  | 'NEEDS_REVIEW'
  | 'LOOKS_BUG'
  | 'LOOKS_SPAM'
  | 'HIGH_RISK';

type Recommendation =
  | 'AUTO_ONBOARD'
  | 'MANUAL_REVIEW'
  | 'DO_NOT_AUTO_APPROVE';

type PreferredContactType =
  | 'business'
  | 'personal'
  | '';

interface SellerApplication {
  fullName: string;

  businessName: string;

  businessEmail: string;

  personalEmail: string;

  preferredContactType:
    PreferredContactType;

  preferredContactEmail: string;

  phone: string;

  country: string;

  address: string;

  city: string;

  state: string;

  zipCode: string;

  website: string;

  businessType: string;

  yearsInBusiness: string;

  productCategories: string;

  businessInformation: string;

  whyWorkWithAuronix: string;

  catalogUrl: string;

  contactAgreement: boolean;
}

interface FirstAIResult {
  label: ScreeningLabel;

  confidence: number;

  summary: string;

  reasons: string[];

  positiveSignals: string[];

  riskSignals: string[];

  missingInformation: string[];

  contradictions: string[];
}

interface SecondAIResult {
  approved: boolean;

  confidence: number;

  reasons: string[];

  riskSignals: string[];

  contradictions: string[];

  summary: string;
}

function text(
  value: unknown
): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value).trim();
  }

  return '';
}

function bool(
  value: unknown
): boolean {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}

function unique(
  values: string[]
): string[] {
  const cleaned = values
    .map(text)
    .filter(Boolean);

  return Array.from(
    new Set(cleaned)
  );
}

function normalizeConfidence(
  value: unknown
): number {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}

function parseJson(
  value: string
): Record<
  string,
  unknown
> | null {
  const cleaned =
    value
      .replace(
        /^```json/i,
        ''
      )
      .replace(
        /^```/i,
        ''
      )
      .replace(
        /```$/i,
        ''
      )
      .trim();

  try {
    const parsed =
      JSON.parse(
        cleaned
      );

    if (
      parsed &&
      typeof parsed ===
        'object'
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeApplication(
  raw: Record<string, unknown>
): SellerApplication {
  const businessEmail =
    text(
      raw.businessEmail ||
        raw.email
    );

  const personalEmail =
    text(
      raw.personalEmail
    );

  const preferredType =
    text(
      raw.preferredContactType
    ).toLowerCase();

  let preferredContactType:
    PreferredContactType =
    '';

  if (
    preferredType ===
    'business'
  ) {
    preferredContactType =
      'business';
  }

  if (
    preferredType ===
    'personal'
  ) {
    preferredContactType =
      'personal';
  }

  let preferredContactEmail =
    text(
      raw.preferredContactEmail
    );

  /*
   * Compatibility for older/newly migrated
   * applications that do not yet have the
   * preferredContactEmail field.
   */
  if (
    !preferredContactEmail
  ) {
    preferredContactEmail =
      preferredContactType ===
      'personal'
        ? personalEmail
        : businessEmail;
  }

  return {
    fullName:
      text(
        raw.fullName
      ),

    businessName:
      text(
        raw.businessName ||
          raw.companyName ||
          raw.company
      ),

    businessEmail,

    personalEmail,

    preferredContactType,

    preferredContactEmail,

    phone:
      text(
        raw.phone ||
          raw.phoneNumber
      ),

    country:
      text(
        raw.country
      ),

    address:
      text(
        raw.address ||
          raw.businessAddress ||
          raw.streetAddress
      ),

    city:
      text(
        raw.city
      ),

    state:
      text(
        raw.state ||
          raw.province
      ),

    zipCode:
      text(
        raw.zipCode ||
          raw.zip ||
          raw.postalCode
      ),

    website:
      text(
        raw.website ||
          raw.websiteUrl
      ),

    businessType:
      text(
        raw.businessType
      ),

    yearsInBusiness:
      text(
        raw.yearsInBusiness ||
          raw.years_in_business
      ),

    productCategories:
      text(
        raw.productCategories ||
          raw.categories ||
          raw.category
      ),

    businessInformation:
      text(
        raw.businessInformation ||
          raw.businessDescription ||
          raw.description
      ),

    whyWorkWithAuronix:
      text(
        raw.whyWorkWithAuronix ||
          raw.whyAuronix ||
          raw.message ||
          raw.comments
      ),

    catalogUrl:
      text(
        raw.catalogUrl ||
          raw.catalogURL ||
          raw.catalogLink
      ),

    contactAgreement:
      bool(
        raw.contactAgreement ||
          raw.agreeToContact ||
          raw.consent
      ),
  };
}

/**
 * Compare only applicant-owned answers. Administrative writes such as status,
 * timestamps, notifications, and a concurrent screening result must not make a
 * valid review look stale.
 */
function applicationInputVersion(raw: Record<string, unknown>): string {
  const applicantAnswers: Partial<SellerApplication> = { ...normalizeApplication(raw) };
  delete applicantAnswers.preferredContactEmail;
  return JSON.stringify(applicantAnswers);
}

function getPreferredEmail(
  application: SellerApplication
): string {
  if (
    application.preferredContactType ===
      'personal' &&
    application.personalEmail
  ) {
    return application.personalEmail;
  }

  if (
    application.preferredContactType ===
      'business' &&
    application.businessEmail
  ) {
    return application.businessEmail;
  }

  /*
   * If the selected type is missing but a preferred
   * address exists, honor it.
   */
  if (
    application.preferredContactEmail
  ) {
    return application.preferredContactEmail;
  }

  /*
   * Compatibility fallback.
   */
  return (
    application.businessEmail ||
    application.personalEmail
  );
}

function emailDomain(
  email: string
): string {
  return (
    email
      .split('@')[1]
      ?.trim()
      .toLowerCase() ||
    ''
  );
}

function isFreeEmailProvider(
  email: string
): boolean {
  const domain =
    emailDomain(
      email
    );

  const freeProviders = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'ymail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'icloud.com',
    'me.com',
    'proton.me',
    'protonmail.com',
    'aol.com',
    'mail.com',
  ];

  return freeProviders.includes(
    domain
  );
}

function missingRequiredFields(
  app: SellerApplication
): string[] {
  const missing: string[] =
    [];

  const required: Array<
    [keyof SellerApplication, string]
  > = [
    ['fullName', 'Full Name'],
    [
      'businessName',
      'Business Name',
    ],
    [
      'businessEmail',
      'Business Email',
    ],
    [
      'personalEmail',
      'Personal Email',
    ],
    ['phone', 'Phone'],
    ['country', 'Country'],
    ['address', 'Address'],
    ['city', 'City'],
    [
      'state',
      'State / Province',
    ],
    [
      'zipCode',
      'ZIP / Postal Code',
    ],
    [
      'businessType',
      'Business Type',
    ],
    [
      'productCategories',
      'Product Categories',
    ],
    [
      'businessInformation',
      'Business Information',
    ],
    [
      'whyWorkWithAuronix',
      'Why Work With Auronix',
    ],
  ];

  for (
    const [
      key,
      label,
    ] of required
  ) {
    const value =
      String(
        app[key] ??
          ''
      ).trim();

    if (
      !value
    ) {
      missing.push(
        label
      );
    }
  }

  if (
    !app.contactAgreement
  ) {
    missing.push(
      'Contact Agreement'
    );
  }

  if (
    !app.preferredContactType
  ) {
    missing.push(
      'Preferred Contact Email'
    );
  }

  if (
    !app.preferredContactEmail
  ) {
    missing.push(
      'Preferred Contact Address'
    );
  }

  return unique(
    missing
  );
}

function deterministicChecks(
  app: SellerApplication
) {
  const missing =
    missingRequiredFields(
      app
    );

  const issues: string[] =
    [];

  const riskSignals: string[] =
    [];

  /*
   * Email validation.
   */
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      app.businessEmail
    )
  ) {
    issues.push(
      'Business email format is invalid.'
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      app.personalEmail
    )
  ) {
    issues.push(
      'Personal email format is invalid.'
    );
  }

  /*
   * Preferred email must actually match
   * the selected source.
   */
  const expectedPreferred =
    app.preferredContactType ===
    'personal'
      ? app.personalEmail
      : app.businessEmail;

  if (
    expectedPreferred &&
    app.preferredContactEmail &&
    expectedPreferred
      .toLowerCase() !==
      app.preferredContactEmail
        .toLowerCase()
  ) {
    issues.push(
      'Preferred contact email does not match the selected email type.'
    );
  }

  /*
   * Personal free email is NORMAL.
   *
   * We deliberately do NOT put this in riskSignals.
   */
  const personalUsesFreeProvider =
    isFreeEmailProvider(
      app.personalEmail
    );

  /*
   * Business free email may be recorded as
   * a neutral quality observation.
   *
   * It is NOT a risk signal by itself.
   */
  const businessUsesFreeProvider =
    isFreeEmailProvider(
      app.businessEmail
    );

  /*
   * Years in business.
   */
  if (
    app.yearsInBusiness
  ) {
    const years =
      Number(
        app.yearsInBusiness
      );

    if (
      !Number.isFinite(
        years
      ) ||
      years < 0 ||
      years > 100
    ) {
      issues.push(
        'Years in business is outside the valid range.'
      );
    }
  }

  /*
   * Explicit spam/security patterns.
   *
   * These are actual risk signals.
   */
  const content = [
    app.fullName,
    app.businessName,
    app.productCategories,
    app.businessInformation,
    app.whyWorkWithAuronix,
  ]
    .join(' ')
    .toLowerCase();

  const suspiciousPatterns = [
    /send (us|me) your password/i,
    /send (us|me) your credentials/i,
    /send (us|me) your otp/i,
    /send payment now/i,
    /send money now/i,
    /guaranteed profits/i,
    /100% guaranteed/i,
    /free money/i,
    /winner.*cash/i,
    /buy now.*buy now/i,
  ];

  for (
    const pattern of
    suspiciousPatterns
  ) {
    if (
      pattern.test(
        content
      )
    ) {
      riskSignals.push(
        'Obvious spam or security-sensitive language detected.'
      );

      break;
    }
  }

  /*
   * Basic URL sanity.
   */
  for (
    const [
      label,
      url,
    ] of [
      [
        'Website',
        app.website,
      ],
      [
        'Catalog URL',
        app.catalogUrl,
      ],
    ] as const
  ) {
    if (
      url &&
      !/^https?:\/\//i.test(
        url
      )
    ) {
      issues.push(
        `${label} does not use a standard HTTP/HTTPS URL.`
      );
    }
  }

  /*
   * Deterministic quality.
   */
  let quality = 0;

  quality +=
    missing.length === 0
      ? 50
      : Math.round(
          (
            1 -
            missing.length /
              16
          ) *
            50
        );

  if (
    app.businessInformation.length >=
    100
  ) {
    quality += 15;
  }

  if (
    app.whyWorkWithAuronix.length >=
    50
  ) {
    quality += 15;
  }

  if (
    app.productCategories.length >=
    8
  ) {
    quality += 10;
  }

  if (
    app.website
  ) {
    quality += 5;
  }

  if (
    app.catalogUrl
  ) {
    quality += 5;
  }

  if (
    riskSignals.length
  ) {
    quality -= Math.min(
      40,
      riskSignals.length *
        15
    );
  }

  quality =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          quality
        )
      )
    );

  return {
    missing,

    issues,

    riskSignals:
      unique(
        riskSignals
      ),

    quality,

    complete:
      missing.length === 0,

    meaningfulBusinessInfo:
      app.businessInformation
        .length >= 100,

    meaningfulMotivation:
      app.whyWorkWithAuronix
        .length >= 50,

    meaningfulProducts:
      app.productCategories
        .length >= 8,

    personalUsesFreeProvider,

    businessUsesFreeProvider,
  };
}

async function firstAIReview(
  app: SellerApplication
): Promise<FirstAIResult> {
  const prompt = `
You are Auronix Commerce LLC's first-stage seller application screening AI.

CURRENT SELLER APPLICATION EMAIL MODEL:

Every applicant provides TWO email addresses:

1. Business Email
2. Personal Email

They also select:
- Business Email
OR
- Personal Email

as their preferred contact channel.

CRITICAL EMAIL RULES:

- Personal Gmail/Yahoo/Outlook/Hotmail/iCloud/Proton/etc. is NORMAL.
- A free personal email MUST NEVER be treated as a risk by itself.
- A business email on a free provider MAY be a business-quality observation.
- A free business email MUST NOT automatically cause LOOKS_SPAM or HIGH_RISK.
- A professional company-domain business email can be a positive signal when consistent with the business information.
- Evaluate email quality together with the entire application.

CURRENT FORM FIELDS:

Required:
Full Name
Business Name
Business Email
Personal Email
Phone
Country
Address
City
State / Province
ZIP / Postal Code
Business Type
Product Categories
Business Information
Why Work With Auronix
Preferred Contact Email
Contact Agreement

Optional:
Website
Years in Business
Catalog URL

DO NOT invent or expect:
- Products field
- Business Description field
- separate product URL
- additional address fields

Product information is represented by:
Product Categories + Business Information.

DO NOT claim legal identity verification.

ONLY classify as spam/high risk when there is actual evidence such as:
- credential requests
- OTP/password requests
- payment scams
- malicious instructions
- impersonation
- obvious spam advertising
- deceptive or contradictory information

Missing information should generally be:
LOOKS_BUG or NEEDS_REVIEW

A strong complete application may be:
LOOKS_GOOD or AI_APPROVED

Return JSON only:

{
  "label": "AI_APPROVED | LOOKS_GOOD | NEEDS_REVIEW | LOOKS_BUG | LOOKS_SPAM | HIGH_RISK",
  "confidence": 0,
  "summary": "",
  "reasons": [],
  "positiveSignals": [],
  "riskSignals": [],
  "missingInformation": [],
  "contradictions": []
}
`;

  const userPrompt = `
NORMALIZED APPLICATION:

${JSON.stringify(
    app,
    null,
    2
  )}
`;

  const raw =
    await generateGroqResponse(
      prompt,
      userPrompt,
      1600
    );

  const parsed =
    parseJson(
      raw
    );

  if (
    !parsed
  ) {
    throw new Error(
      'First AI review returned invalid JSON.'
    );
  }

  return {
    label:
      text(
        parsed.label
      ) as ScreeningLabel,

    confidence:
      normalizeConfidence(
        parsed.confidence
      ),

    summary:
      text(
        parsed.summary
      ),

    reasons:
      Array.isArray(
        parsed.reasons
      )
        ? parsed.reasons
            .map(text)
            .filter(Boolean)
        : [],

    positiveSignals:
      Array.isArray(
        parsed.positiveSignals
      )
        ? parsed.positiveSignals
            .map(text)
            .filter(Boolean)
        : [],

    riskSignals:
      Array.isArray(
        parsed.riskSignals
      )
        ? parsed.riskSignals
            .map(text)
            .filter(Boolean)
        : [],

    missingInformation:
      Array.isArray(
        parsed.missingInformation
      )
        ? parsed.missingInformation
            .map(text)
            .filter(Boolean)
        : [],

    contradictions:
      Array.isArray(
        parsed.contradictions
      )
        ? parsed.contradictions
            .map(text)
            .filter(Boolean)
        : [],
  };
}

async function secondAIReview(
  app: SellerApplication,
  first: FirstAIResult,
  checks: ReturnType<
    typeof deterministicChecks
  >
): Promise<SecondAIResult> {
  const prompt = `
You are Auronix Commerce LLC's independent SECOND seller verification AI.

Your role is to challenge the first AI assessment.

EMAIL POLICY:

The application contains:
- Business Email
- Personal Email
- Preferred Contact Email

A free personal email address such as Gmail, Yahoo,
Outlook, Hotmail, iCloud or Proton is NORMAL.

A free personal email MUST NOT be treated as risk.

A free business email can be a business-quality concern,
but MUST NOT cause rejection by itself.

A company-domain business email may be a positive signal,
but it is NOT proof of legal identity.

Review the entire application.

Automatic approval should only be supported when:
- required fields are complete
- application is coherent
- business information is meaningful
- motivation is meaningful
- there are no meaningful contradictions
- there are no meaningful security/spam signals
- the first review was reasonable

Do NOT invent risk.

Return JSON only:

{
  "approved": false,
  "confidence": 0,
  "reasons": [],
  "riskSignals": [],
  "contradictions": [],
  "summary": ""
}
`;

  const userPrompt = `
APPLICATION:

${JSON.stringify(
    app,
    null,
    2
  )}

FIRST AI:

${JSON.stringify(
    first,
    null,
    2
  )}

DETERMINISTIC CHECKS:

${JSON.stringify(
    checks,
    null,
    2
  )}

Perform an independent review.
`;

  const raw =
    await generateGroqResponse(
      prompt,
      userPrompt,
      1400
    );

  const parsed =
    parseJson(
      raw
    );

  if (
    !parsed
  ) {
    throw new Error(
      'Second AI review returned invalid JSON.'
    );
  }

  return {
    approved:
      parsed.approved ===
      true,

    confidence:
      normalizeConfidence(
        parsed.confidence
      ),

    reasons:
      Array.isArray(
        parsed.reasons
      )
        ? parsed.reasons
            .map(text)
            .filter(Boolean)
        : [],

    riskSignals:
      Array.isArray(
        parsed.riskSignals
      )
        ? parsed.riskSignals
            .map(text)
            .filter(Boolean)
        : [],

    contradictions:
      Array.isArray(
        parsed.contradictions
      )
        ? parsed.contradictions
            .map(text)
            .filter(Boolean)
        : [],

    summary:
      text(
        parsed.summary
      ),
  };
}

function deterministicFallbackReview(
  checks: ReturnType<typeof deterministicChecks>
): FirstAIResult {
  const serious = checks.riskSignals.some(signal => /fraud|scam|malicious|credential|password|otp|payment|phishing|impersonat/i.test(signal));
  const label: ScreeningLabel = checks.riskSignals.length
    ? (serious ? 'HIGH_RISK' : 'NEEDS_REVIEW')
    : checks.missing.length >= 4
      ? 'LOOKS_BUG'
      : checks.missing.length
        ? 'NEEDS_REVIEW'
        : 'LOOKS_GOOD';
  return {
    label,
    confidence: Math.max(55, Math.min(90, checks.quality)),
    summary: 'Deterministic application checks completed. Model-assisted analysis was unavailable, so manual review remains required.',
    reasons: unique([...checks.issues, 'Model-assisted analysis was unavailable; no automatic decision was made.']),
    positiveSignals: checks.complete ? ['All required application fields are present.'] : [],
    riskSignals: checks.riskSignals,
    missingInformation: checks.missing,
    contradictions: [],
  };
}

async function approveAndSendInvitation(
  applicationId: string,
  app: SellerApplication,
  first: FirstAIResult,
  second: SecondAIResult,
  deterministicQuality: number,
  expectedInputVersion: string
) {
  const applicationRef =
    adminDb.ref(
      `sellerApplications/${applicationId}`
    );

  const before =
    await applicationRef.get();

  if (
    !before.exists()
  ) {
    throw new Error(
      'Application no longer exists.'
    );
  }

  const existing =
    before.val() as Record<
      string,
      unknown
    >;

  /*
   * Prevent duplicate automatic emails.
   */
  if (
    existing.invitationSentAt
  ) {
    return {
      approved: true,

      invitationSent: false,

      alreadySent: true,

      selectedEmail:
        text(
          existing
            .preferredContactEmail
        ),
    };
  }

  const preferredEmail =
    getPreferredEmail(
      app
    );

  if (
    !preferredEmail
  ) {
    throw new Error(
      'No valid preferred contact email is available.'
    );
  }

  const selectedType =
    app.preferredContactType ||
    'business';

  const { invitationUrl: url, expiresAt } = await issueSellerInvitation(applicationId);

  /*
   * Save approval before sending email so
   * the decision is auditable.
   */
  const approved = await applicationRef.transaction(current => current && applicationInputVersion(current) === expectedInputVersion && ['pending','under_review','screening'].includes(current.status || 'pending') ? {
    ...current,
    status:
      'approved',

    approvedBy:
      'ai-auto-approval',

    approvedAt:
      Date.now(),

    aiAutoApproved:
      true,

    aiAutoApprovedAt:
      Date.now(),

    accountCreated:
      false,

    accountCreationStatus:
      'invitation_pending',

    preferredContactEmail:
      preferredEmail,

    preferredContactType:
      selectedType,

    invitationUrl:
      url,

    aiVerification: {
      firstPass:
        first,

      secondPass:
        second,

      deterministicQuality,

      verificationVersion:
        'seller-auto-email-v1',

      verifiedAt:
        Date.now(),
    },

    updatedAt:
      Date.now(),
  } : undefined);
  if (!approved.committed) throw new Error('The application changed before approval. Review its latest version.');

  try {
    await sendSellerInvitationEmail({
      email:
        preferredEmail,

      name:
        app.fullName,
invitationUrl:
        url,
      expiresAt,
    });

    await applicationRef.update({
      invitationSentAt:
        Date.now(),

      invitationSentBy:
        'ai-auto-approval',

      invitationDestination:
        preferredEmail,

      invitationDestinationType:
        selectedType,

      accountCreationStatus:
        'invitation_sent',

      updatedAt:
        Date.now(),
    });

    return {
      approved: true,

      invitationSent:
        true,

      alreadySent:
        false,

      selectedEmail:
        preferredEmail,

      selectedType,
    };
  } catch (
    emailError
  ) {
    await applicationRef.update({
      accountCreationStatus:
        'invitation_failed',

      invitationError:
        emailError instanceof Error
          ? userFacingError(emailError)
          : 'Invitation email failed.',

      updatedAt:
        Date.now(),
    });

    throw emailError;
  }
}

async function processApplication(
  applicationId: string,
  automatic: boolean
) {
  const applicationRef =
    adminDb.ref(
      `sellerApplications/${applicationId}`
    );

  const snapshot =
    await applicationRef.get();

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      'Seller application was not found.'
    );
  }

  const raw =
    snapshot.val() as Record<
      string,
      unknown
    >;

  if (raw.status === 'changes_requested') throw new Error('Waiting for applicant corrections.');
  const inputVersion = applicationInputVersion(raw);
  if (['pending', 'under_review', 'screening'].includes(String(raw.status || 'pending'))) {
    const started = await applicationRef.transaction(current => current && applicationInputVersion(current) === inputVersion && ['pending','under_review','screening'].includes(current.status || 'pending') ? { ...current, status: 'under_review', updatedAt: Date.now() } : undefined);
    if (!started.committed) throw new Error('The application changed. Review its latest version.');
    if ((raw.status || 'pending') === 'pending') await notifySellerApplication(applicationId, raw, 'Your Auronix application is being reviewed', 'The review team has started reviewing your application. Track its progress online.');
  }

  const app =
    normalizeApplication(
      raw
    );

  const checks =
    deterministicChecks(
      app
    );

  let modelAvailable = true;
  let first: FirstAIResult;
  try {
    first = await firstAIReview(app);
  } catch (error) {
    modelAvailable = false;
    console.error('Seller screening model unavailable; using deterministic review:', error instanceof Error ? userFacingError(error) : 'Unknown model error');
    first = deterministicFallbackReview(checks);
  }

  /*
   * Normalize model-generated free-email risk.
   *
   * A personal free email is NEVER risk.
   *
   * For a business email, this is informational only.
   */
  const filteredFirstRisk =
    first.riskSignals.filter(
      (signal) =>
        !/free email|free business email|gmail|yahoo|hotmail|outlook|icloud|proton/i.test(
          signal
        )
    );

  /*
   * A complete, clean application always gets
   * the independent second review.
   *
   * We do NOT depend on the model's arbitrary
   * confidence value to decide this.
   */
  const eligibleForSecondReview =
    checks.complete &&
    checks.meaningfulBusinessInfo &&
    checks.meaningfulMotivation &&
    checks.meaningfulProducts &&
    checks.riskSignals.length ===
      0 &&
    filteredFirstRisk.length ===
      0 &&
    first.contradictions.length ===
      0 &&
    first.label !==
      'LOOKS_SPAM' &&
    first.label !==
      'HIGH_RISK';

  let second:
    | SecondAIResult
    | null =
    null;

  if (
    eligibleForSecondReview
  ) {
    try {
      second = await secondAIReview(app, { ...first, riskSignals: filteredFirstRisk }, checks);
    } catch (error) {
      modelAvailable = false;
      second = null;
      console.error('Independent seller review unavailable; preserving manual-review result:', error instanceof Error ? userFacingError(error) : 'Unknown model error');
    }
  }

  const secondRisk =
    second
      ? second.riskSignals.filter(
          (signal) =>
            !/free email|free business email|gmail|yahoo|hotmail|outlook|icloud|proton/i.test(
              signal
            )
        )
      : [];

  const combinedRisk =
    unique([
      ...checks.riskSignals,

      ...filteredFirstRisk,

      ...secondRisk,
    ]);

  const combinedContradictions =
    unique([
      ...first.contradictions,

      ...(second?.contradictions ||
        []),
    ]);

  const autoEligible =
    automatic &&

    modelAvailable &&

    checks.complete &&

    checks.quality >=
      90 &&

    checks.meaningfulBusinessInfo &&

    checks.meaningfulMotivation &&

    checks.meaningfulProducts &&

    combinedRisk.length ===
      0 &&

    combinedContradictions.length ===
      0 &&

    first.label !==
      'LOOKS_SPAM' &&

    first.label !==
      'HIGH_RISK' &&

    second !==
      null &&

    second.approved ===
      true &&

    second.confidence >=
      95;

  let label:
    ScreeningLabel;

  let recommendation:
    Recommendation;

  let confidence =
    0;

  if (
    combinedRisk.length >
    0
  ) {
    const serious =
      combinedRisk.some(
        (signal) =>
          /fraud|scam|malicious|credential|password|otp|payment|phishing|impersonat/i.test(
            signal
          )
      );

    label =
      serious
        ? 'HIGH_RISK'
        : 'LOOKS_SPAM';

    recommendation =
      'DO_NOT_AUTO_APPROVE';

    confidence =
      95;
  } else if (
    checks.missing.length >
    0
  ) {
    label =
      checks.missing.length >=
      4
        ? 'LOOKS_BUG'
        : 'NEEDS_REVIEW';

    recommendation =
      'MANUAL_REVIEW';

    confidence =
      90;
  } else if (
    autoEligible
  ) {
    label =
      'AI_APPROVED';

    recommendation =
      'AUTO_ONBOARD';

    confidence =
      100;
  } else if (
    second &&
    !second.approved
  ) {
    label =
      'NEEDS_REVIEW';

    recommendation =
      'MANUAL_REVIEW';

    confidence =
      Math.max(
        85,
        second.confidence
      );
  } else {
    label =
      'LOOKS_GOOD';

    recommendation =
      'MANUAL_REVIEW';

    confidence =
      90;
  }

  const reasons =
    unique([
      ...checks.issues,

      ...first.reasons,

      ...(second?.reasons ||
        []),

      `Deterministic quality: ${checks.quality}/100.`,

      second
        ? `Independent second AI verification: ${second.confidence}% confidence.`
        : 'Second AI verification was not triggered.',
    ]);

  const positiveSignals =
    unique([
      ...first.positiveSignals,
    ]);

  if (
    checks.personalUsesFreeProvider
  ) {
    positiveSignals.push(
      'Personal email uses a free provider; this is considered normal.'
    );
  }

  if (
    checks.businessUsesFreeProvider
  ) {
    reasons.push(
      'Business email uses a free provider. This is a business-quality observation only and is not treated as spam by itself.'
    );
  } else {
    positiveSignals.push(
      'Business email uses a non-free domain.'
    );
  }

  if (
    app.preferredContactType
  ) {
    positiveSignals.push(
      `Applicant selected ${app.preferredContactType} email as the preferred contact channel.`
    );
  }

  if (
    autoEligible
  ) {
    reasons.push(
      'All required information is complete.'
    );

    reasons.push(
      'First AI review passed.'
    );

    reasons.push(
      'Independent second AI review passed.'
    );

    reasons.push(
      'No material risk signals were detected.'
    );

    reasons.push(
      'Selected preferred email is ready for account invitation.'
    );

    reasons.push(
      'Automatic onboarding threshold was satisfied.'
    );
  }

  const result = {
    label,

    confidence,

    summary:
      !modelAvailable
        ? 'Deterministic screening completed successfully. Model-assisted analysis is temporarily unavailable, so this application remains queued for manual review.'
        : autoEligible
        ? 'The application passed deterministic validation and two independent AI reviews and is eligible for automatic onboarding.'
        : label ===
            'HIGH_RISK'
          ? 'Strong security or fraud indicators were detected. Automatic onboarding is blocked.'
          : label ===
              'LOOKS_SPAM'
            ? 'Spam-like indicators were detected. Manual review is required.'
            : label ===
                'LOOKS_BUG'
              ? 'The application is incomplete and requires correction or review.'
              : label ===
                  'NEEDS_REVIEW'
                ? 'The application requires manual review before approval.'
                : 'The application looks generally strong but did not satisfy every automatic-onboarding requirement.',

    reasons,

    positiveSignals,

    riskSignals:
      combinedRisk,

    missingInformation:
      unique(
        checks.missing
      ),

    contradictions:
      combinedContradictions,

    recommendation,

    screeningMode: modelAvailable ? 'model-assisted' : 'deterministic-fallback',

    modelAvailable,

    autoEligible,

    firstPass: {
      label:
        first.label,

      confidence:
        normalizeConfidence(
          first.confidence
        ),
    },

    secondPass: second
      ? {
          approved:
            second.approved,

          confidence:
            normalizeConfidence(
              second.confidence
            ),
        }
      : null,

    deterministicQuality:
      checks.quality,

    verificationRoutes: [
      'deterministic-validation',

      ...(modelAvailable ? ['first-ai-review'] : ['deterministic-fallback']),

      ...(second
        ? [
            'independent-second-ai-review',
          ]
        : []),
    ],

    emailVerification: {
      businessEmail:
        app.businessEmail,

      personalEmail:
        app.personalEmail,

      preferredContactType:
        app.preferredContactType,

      preferredContactEmail:
        getPreferredEmail(
          app
        ),

      personalEmailIsFreeProvider:
        checks.personalUsesFreeProvider,

      businessEmailIsFreeProvider:
        checks.businessUsesFreeProvider,
    },

    screenedAt:
      Date.now(),

    version:
      'seller-screen-v8',
  };

  const savedReview = await applicationRef.transaction(current => current && applicationInputVersion(current) === inputVersion && current.status !== 'changes_requested' ? {
    ...current,
    aiStatus:
      label,

    aiScore:
      confidence,

    aiAutoEligible:
      autoEligible,

    aiScreening:
      result,

    preferredContactEmail:
      getPreferredEmail(
        app
      ),

    updatedAt:
      Date.now(),
  } : undefined);
  if (!savedReview.committed) throw new Error('The application changed during review. Review its latest version.');

  let automaticOnboarding:
    | Record<
        string,
        unknown
      >
    | null =
    null;

  if (
    autoEligible
  ) {
    try {
      automaticOnboarding =
        await approveAndSendInvitation(
          applicationId,

          app,

          first,

          second!,

          checks.quality,
          inputVersion
        );
    } catch (
      error
    ) {
      automaticOnboarding =
        {
          approved:
            false,

          invitationSent:
            false,

          error:
            error instanceof Error
              ? userFacingError(error)
              : 'Automatic invitation failed.',
        };
    }
  }

  return {
    applicationId,

    screening:
      result,

    automaticOnboarding,
  };
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const body =
      await request.json();

    const applicationId =
      text(
        body.applicationId
      );

    /*
     * Single application
     */
    if (
      applicationId
    ) {
      return NextResponse.json({
        success:
          true,

        ...(await processApplication(
          applicationId,

          body.automatic ===
            true
        )),
      });
    }

    /*
     * Automatic screening of all pending
     * applications.
     */
    if (
      body.screenAll ===
      true
    ) {
      const snapshot =
        await adminDb
          .ref(
            'sellerApplications'
          )
          .get();

      if (
        !snapshot.exists()
      ) {
        return NextResponse.json({
          success:
            true,

          screened:
            0,

          results: [],
        });
      }

      const applications =
        snapshot.val() as Record<
          string,
          Record<
            string,
            unknown
          >
        >;

      const results: unknown[] =
        [];

      for (
        const [
          id,
          application,
        ] of Object.entries(
          applications
        )
      ) {
        const status =
          text(
            application.status
          ).toLowerCase();

        /*
         * Never automatically re-process
         * approved or rejected records.
         */
        if (!['pending', 'under_review', 'screening'].includes(status)) {
          continue;
        }

        const version =
          text(
            (
              application
                .aiScreening as
                | Record<
                    string,
                    unknown
                  >
                | undefined
            )?.version
          );

        /*
         * Re-screen old versions.
         */
        if (
          version ===
            'seller-screen-v8' &&
          application.aiAutoApproved !==
            true
        ) {
          continue;
        }

        try {
          results.push(
            await processApplication(
              id,

              body.automatic ===
                true
            )
          );
        } catch (
          error
        ) {
          results.push({
            applicationId:
              id,

            error:
              error instanceof
              Error
                ? userFacingError(error)
                : 'Screening failed.',
          });
        }
      }

      return NextResponse.json({
        success:
          true,

        screened:
          results.filter(
            (
              result: any
            ) =>
              !result.error
          ).length,

        results,
      });
    }

    return NextResponse.json(
      {
        error:
          'Provide applicationId or screenAll=true.',
      },
      {
        status:
          400,
      }
    );
  } catch (
    error
  ) {
    console.error(
      'Seller AI screening failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? userFacingError(error)
            : 'Seller AI screening failed.',
      },
      {
        status:
          500,
      }
    );
  }
}
