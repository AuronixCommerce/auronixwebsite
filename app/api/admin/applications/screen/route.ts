import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { generateGroqResponse } from '@/lib/server-groq';

type ApplicationType = 'seller' | 'supplier';

type ScreeningLabel =
  | 'looks-good'
  | 'needs-review'
  | 'looks-suspicious'
  | 'looks-like-spam';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getCollection(type: ApplicationType): string {
  return type === 'seller'
    ? 'sellerApplications'
    : 'suppliers';
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
}

function parseAIResult(value: string) {
  const cleaned = value
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function calculateDeterministicChecks(
  type: ApplicationType,
  application: Record<string, unknown>
) {
  const requiredFields =
    type === 'seller'
      ? [
          'name',
          'email',
          'company',
          'phone',
          'businessName',
        ]
      : [
          'name',
          'email',
          'company',
          'businessName',
          'catalog',
        ];

  const aliases: Record<string, string[]> = {
    name: ['name', 'fullName', 'contactName'],
    email: ['email', 'contactEmail'],
    company: [
      'company',
      'companyName',
      'businessName',
      'organization',
    ],
    phone: [
      'phone',
      'phoneNumber',
      'contactPhone',
    ],
    businessName: [
      'businessName',
      'companyName',
      'company',
    ],
    catalog: [
      'catalog',
      'catalogUrl',
      'catalogLink',
      'catalogFile',
      'products',
    ],
  };

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const options = aliases[field] || [field];

    const found = options.some((key) => {
      const value = application[key];

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      return value !== null && value !== undefined;
    });

    if (!found) {
      missingFields.push(field);
    }
  }

  const email = text(
    application.email ??
      application.contactEmail
  ).toLowerCase();

  const messageBlob = JSON.stringify(
    application
  ).toLowerCase();

  const spamSignals: string[] = [];

  if (
    email &&
    (
      email.includes('tempmail') ||
      email.includes('guerrillamail') ||
      email.includes('mailinator') ||
      email.includes('10minutemail')
    )
  ) {
    spamSignals.push(
      'Disposable or temporary email pattern'
    );
  }

  const repeatedSpamWords = [
    'crypto giveaway',
    'free money',
    'click here urgently',
    'guaranteed profit',
    'casino',
    'adult content',
  ];

  for (const phrase of repeatedSpamWords) {
    if (messageBlob.includes(phrase)) {
      spamSignals.push(
        `Spam phrase detected: ${phrase}`
      );
    }
  }

  return {
    missingFields,
    spamSignals,
  };
}

function normalizeLabel(
  value: unknown
): ScreeningLabel {
  const label = text(value).toLowerCase();

  if (
    label === 'looks-good' ||
    label === 'looks good'
  ) {
    return 'looks-good';
  }

  if (
    label === 'looks-suspicious' ||
    label === 'looks suspicious'
  ) {
    return 'looks-suspicious';
  }

  if (
    label === 'looks-like-spam' ||
    label === 'looks like spam' ||
    label === 'spam'
  ) {
    return 'looks-like-spam';
  }

  return 'needs-review';
}

export async function POST(
  request: Request
) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();

    const type = body.applicationType as ApplicationType;
    const applicationId = text(body.applicationId);

    if (
      type !== 'seller' &&
      type !== 'supplier'
    ) {
      return NextResponse.json(
        {
          error:
            'applicationType must be seller or supplier.',
        },
        { status: 400 }
      );
    }

    if (!applicationId) {
      return NextResponse.json(
        {
          error:
            'applicationId is required.',
        },
        { status: 400 }
      );
    }

    const collection = getCollection(type);

    const applicationRef = adminDb.ref(
      `${collection}/${applicationId}`
    );

    const snapshot =
      await applicationRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        {
          error:
            'Application not found.',
        },
        { status: 404 }
      );
    }

    const application =
      snapshot.val() as Record<string, unknown>;

    const deterministic =
      calculateDeterministicChecks(
        type,
        application
      );

    const prompt = `
You are reviewing a ${type} application for Auronix Commerce LLC.

Your task is SCREENING, not final approval.

Application:
${safeJson(application)}

Deterministic checks:
${safeJson(deterministic)}

Classify the submission using exactly one label:

looks-good
needs-review
looks-suspicious
looks-like-spam

Definitions:

looks-good:
The submission is substantially complete, internally consistent,
commercially plausible, and does not contain obvious spam indicators.

needs-review:
Some information is missing, unclear, inconsistent, or cannot
be confidently evaluated.

looks-suspicious:
There are meaningful inconsistencies, questionable claims,
or unusual signals that deserve manual review.

looks-like-spam:
The submission contains strong evidence of spam, abuse,
fake promotional content, obvious automated junk, or unrelated
content.

Do NOT claim identity verification.
Do NOT claim the business is legally registered unless the supplied
application itself contains appropriate evidence.
Do NOT infer protected or sensitive personal characteristics.

Return ONLY valid JSON:

{
  "label": "looks-good",
  "confidence": 0.0,
  "summary": "brief explanation",
  "reasons": ["reason 1", "reason 2"],
  "missingFields": ["field"],
  "spamSignals": ["signal"],
  "manualReviewRecommended": true
}
`;

    const system = `
You are an application screening assistant for Auronix Commerce LLC.

Be conservative.

A good-looking application is NOT the same thing as a verified person
or verified business.

Never invent facts.
Never claim government verification.
Never approve or reject an applicant.
Never use protected characteristics in the decision.
Return strict JSON only.
`;

    const aiRaw =
      await generateGroqResponse(
        system,
        prompt,
        700
      );

    const ai =
      parseAIResult(aiRaw) || {};

    const aiLabel =
      normalizeLabel(ai.label);

    const confidenceRaw =
      Number(ai.confidence);

    const confidence =
      Number.isFinite(confidenceRaw)
        ? Math.max(
            0,
            Math.min(1, confidenceRaw)
          )
        : 0;

    const missingFields = Array.from(
      new Set([
        ...deterministic.missingFields,
        ...(Array.isArray(
          ai.missingFields
        )
          ? ai.missingFields
              .filter(
                (item: unknown) =>
                  typeof item === 'string'
              )
          : []),
      ])
    );

    const spamSignals = Array.from(
      new Set([
        ...deterministic.spamSignals,
        ...(Array.isArray(
          ai.spamSignals
        )
          ? ai.spamSignals
              .filter(
                (item: unknown) =>
                  typeof item === 'string'
              )
          : []),
      ])
    );

    /*
     * Conservative automatic gate:
     *
     * AI alone cannot verify a real person/business.
     * "looks-good" only means low-risk and complete enough
     * to qualify for the next automated step.
     */
    const autoInviteEligible =
      aiLabel === 'looks-good' &&
      confidence >= 0.9 &&
      missingFields.length === 0 &&
      spamSignals.length === 0;

    const screening = {
      label: aiLabel,
      confidence,
      summary:
        text(ai.summary) ||
        'No screening summary provided.',
      reasons: Array.isArray(ai.reasons)
        ? ai.reasons.filter(
            (item: unknown) =>
              typeof item === 'string'
          )
        : [],
      missingFields,
      spamSignals,
      manualReviewRecommended:
        aiLabel !== 'looks-good',
      autoInviteEligible,
      screenedAt: Date.now(),
      screenedBy: 'AI',
      reviewedByAdminUid: admin.uid,
    };

    await applicationRef.update({
      aiScreening: screening,
      aiScreeningLabel: aiLabel,
      aiScreenedAt: screening.screenedAt,
    });

    return NextResponse.json({
      success: true,
      screening,
      applicationType: type,
      applicationId,
    });
  } catch (error) {
    console.error(
      'Application AI screening failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to screen application.',
      },
      { status: 500 }
    );
  }
}