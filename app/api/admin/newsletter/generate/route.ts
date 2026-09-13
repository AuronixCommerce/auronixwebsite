import { userFacingError } from '@/lib/user-facing-error';
import { adminDb } from '@/lib/firebase-admin';

import { NextResponse } from 'next/server';

import {
  requireAdmin,
} from '@/lib/server-auth';

import {
  generateGroqResponse,
} from '@/lib/server-groq';

import {
  createTemporaryNewsletterLink,
} from '@/lib/temporary-newsletter-links';

import {
  normalizeCampaignPageData,
} from '@/lib/campaign-page-schema';

const WEBSITE =
  'https://auronixcommerce.com';

const SUPPORT_EMAIL =
  'business@auronixcommerce.com';

function clean(
  value: unknown,
  max = 10000
): string {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

function extractJson(
  value: string
): any {
  const cleaned =
    value
      .replace(
        /^```json\s*/i,
        ''
      )
      .replace(
        /^```\s*/i,
        ''
      )
      .replace(
        /```\s*$/i,
        ''
      )
      .trim();

  try {
    return JSON.parse(
      cleaned
    );
  } catch {
    const start =
      cleaned.indexOf(
        '{'
      );

    const end =
      cleaned.lastIndexOf(
        '}'
      );

    if (
      start >= 0 &&
      end > start
    ) {
      return JSON.parse(
        cleaned.slice(
          start,
          end + 1
        )
      );
    }

    throw new Error(
      'AI returned invalid campaign JSON.'
    );
  }
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function markdownToHtml(
  value: string
): string {
  let html =
    escapeHtml(
      value
    );

  html =
    html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong>$1</strong>'
    );

  html =
    html.replace(
      /\*([^*]+)\*/g,
      '<em>$1</em>'
    );

  return html
    .split(
      /\n\s*\n/
    )
    .map(
      paragraph =>
        '<p style="margin:0 0 18px;color:#333333;font-size:15px;line-height:1.8;">' +
        paragraph.replace(
          /\n/g,
          '<br />'
        ) +
        '</p>'
    )
    .join('');
}

function buildNewsletter(
  page: any,
  campaignUrl: string
) {
  const content =
    [
      page.headline,
      page.subheadline,
      page.description,
      ...page.blocks.map(
        (block: any) => {
          if (
            typeof block?.body ===
            'string'
          ) {
            return block.body;
          }

          if (
            Array.isArray(
              block?.items
            )
          ) {
            return block.items
              .map(
                (item: any) =>
                  [
                    item?.title,
                    item?.description,
                  ]
                    .filter(Boolean)
                    .join(' — ')
              )
              .join('\n');
          }

          if (
            typeof block?.message ===
            'string'
          ) {
            return block.message;
          }

          return '';
        }
      ),
    ]
      .filter(Boolean)
      .join('\n\n');

  return (
    '<!doctype html>' +
    '<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 14px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border-radius:24px;overflow:hidden;">' +
    '<tr><td style="padding:28px 32px;border-bottom:1px solid #eeeeee;">' +
    '<div style="font-size:20px;font-weight:800;">AURONIX</div>' +
    '<div style="margin-top:3px;font-size:9px;font-weight:700;letter-spacing:3px;color:#888888;">COMMERCE LLC</div>' +
    '</td></tr>' +
    '<tr><td style="padding:38px 32px 30px;">' +
    '<h1 style="margin:0;font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-0.04em;">' +
    escapeHtml(page.headline) +
    '</h1>' +
    '<p style="margin:16px 0;color:#666666;font-size:15px;line-height:1.75;">' +
    escapeHtml(page.subheadline) +
    '</p>' +
    markdownToHtml(content) +
    '<div style="margin-top:28px;">' +
    '<a href="' +
    campaignUrl +
    '" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">' +
    escapeHtml(page.primaryCtaText) +
    '</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:28px 32px;background:#fafafa;border-top:1px solid #eeeeee;">' +
    '<div style="font-size:14px;font-weight:700;">Regards,</div>' +
    '<div style="margin-top:6px;font-size:14px;font-weight:700;">Auronix Commerce LLC</div>' +
    '<div style="margin-top:4px;font-size:13px;color:#777777;">eCommerce · Procurement · Marketplace Operations</div>' +
    '<div style="margin-top:14px;font-size:13px;"><a href="' +
    WEBSITE +
    '" style="color:#111111;text-decoration:none;">' +
    WEBSITE +
    '</a></div>' +
    '<div style="margin-top:5px;font-size:13px;"><a href="mailto:' +
    SUPPORT_EMAIL +
    '" style="color:#111111;text-decoration:none;">' +
    SUPPORT_EMAIL +
    '</a></div>' +
    '</td></tr></table></td></tr></table></body></html>'
  );
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const input =
      await request.json();

    const topic =
      clean(
        input?.topic,
        1500
      );

    const instructions =
      clean(
        input?.instructions,
        7000
      );

    if (
      !topic
    ) {
      return NextResponse.json(
        {
          success:
            false,
          error:
            'A campaign topic is required.',
        },
        {
          status:
            400,
        }
      );
    }

    const system = `
You are the senior campaign strategist,
copywriter and landing-page designer for
Auronix Commerce LLC.

You are generating BOTH:

1. a newsletter
2. a temporary campaign landing page

The campaign page must NOT always be a form.

Choose the page type that best matches the topic.

Possible page types:

product-launch
service-launch
announcement
early-access
launch-event
webinar
waitlist
promotion
supplier-opportunity
seller-opportunity
partnership
company-update
article
resource
download
careers
contact
faq
countdown
registration
general

Examples:

Product launch:
Create a product-focused presentation with benefits,
features, CTA and optional inquiry form.

Announcement:
Create an editorial announcement page.
No form unless useful.

Early access:
Create an exclusive access page.
Optional waitlist form.

Launch event:
Create event-focused page with date/countdown,
details, CTA and optional RSVP form.

Webinar:
Create webinar information page with topic,
benefits, speaker/details and optional registration.

Supplier opportunity:
Create supplier-focused opportunity page
with benefits, process and optional application form.

Seller opportunity:
Create seller-focused page with explanation,
requirements and optional application form.

Article:
Create a beautiful editorial article page.
Do NOT add a form unless appropriate.

Resource/download:
Create a resource landing page and optional
lead-capture form.

Careers:
Create an opportunity page and optional
application/contact form.

FAQ:
Create a structured FAQ page.
No form unless appropriate.

Countdown:
Create a countdown-focused campaign page.

IMPORTANT:

Forms are OPTIONAL.

Only set:
"formEnabled": true

when a form genuinely improves the campaign.

The backend will create the working form endpoint.

The generated campaign must look like a real
premium Auronix Commerce landing page, not a
plain text document.

Use multiple visual blocks where useful.

Allowed blocks:

hero
text
features
steps
stats
quote
faq
cta
image
countdown
notice

Never invent statistics or unsupported facts.

Never invent:
revenue
customers
certifications
official marketplace authorization
official partnerships
guarantees
government approvals
unverified dates

If a specific date is not provided, do not invent
one. Use generic wording instead.

Return ONLY valid JSON.

Schema:

{
  "campaignName": "...",
  "pageType": "...",
  "badge": "...",
  "eyebrow": "...",
  "headline": "...",
  "subheadline": "...",
  "description": "...",

  "primaryCtaText": "...",
  "primaryCtaUrl": "/",

  "secondaryCtaText": "",
  "secondaryCtaUrl": "",

  "blocks": [
    {
      "type": "features",
      "title": "...",
      "items": [
        {
          "title": "...",
          "description": "..."
        }
      ]
    }
  ],

  "formEnabled": false,
  "formType": "general",
  "formTitle": "",
  "formDescription": "",
  "formSubmitText": "",
  "formFields": [],

  "successTitle": "",
  "successMessage": ""
}

The CTA URL is only a suggested public destination.
The backend creates the final working campaign URL.

Topic:
${topic}

Additional instructions:
${instructions || 'Choose the best campaign format automatically.'}
`;

    const result =
      await generateGroqResponse(
        system,
        topic,
        2200
      );

    const parsed =
      extractJson(
        result
      );

    const expiresAt =
      Date.now() +
      72 *
        60 *
        60 *
        1000;

    const pageData =
      normalizeCampaignPageData(
        parsed,
        expiresAt
      );

    const campaignId =
      'ai-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(
          2,
          8
        );

    const temporary =
      await createTemporaryNewsletterLink({
        campaignId,

        label:
          pageData.primaryCtaText,

        title:
          pageData.headline,

        destinationPath:
          pageData.primaryCtaUrl ||
          '/',

        expiresAt,

        pageData,
      });

    await adminDb
      .ref(
        `aiGeneratedNewsletterPages/${temporary.token}`
      )
      .set({
        token:
          temporary.token,

        url:
          temporary.url,

        campaignId,

        campaignName:
          pageData.campaignName,

        pageType:
          pageData.pageType,

        title:
          pageData.headline,

        destinationPath:
          pageData.primaryCtaUrl ||
          '/',

        formEnabled:
          pageData.formEnabled,

        createdAt:
          Date.now(),

        expiresAt,

        active:
          true,

        viewCount:
          0,

        reservationCount:
          0,

        source:
          'ai-newsletter',

        activity: {
          created: {
            type:
              'page-created',

            createdAt:
              Date.now(),

            campaignName:
              pageData.campaignName,

            pageType:
              pageData.pageType,

            url:
              temporary.url,
          },
        },
      });

    const newsletterHtml =
      buildNewsletter(
        pageData,
        temporary.url
      );

    const newsletterText =
      [
        pageData.headline,
        pageData.subheadline,
        pageData.description,
        '',
        pageData.primaryCtaText,
        temporary.url,
        '',
        'Regards,',
        'Auronix Commerce LLC',
        WEBSITE,
        SUPPORT_EMAIL,
      ].join('\n');

    return NextResponse.json({
      success:
        true,

      newsletter: {
        subject:
          pageData.campaignName,

        preheader:
          pageData.subheadline,

        html:
          newsletterHtml,

        text:
          newsletterText,
      },

      campaignPage: {
        token:
          temporary.token,

        url:
          temporary.url,

        campaignId,

        campaignName:
          pageData.campaignName,

        pageType:
          pageData.pageType,

        formEnabled:
          pageData.formEnabled,

        expiresAt,
      },
    });
  } catch (
    error
  ) {
    console.error(
      '[Newsletter Campaign Generator]',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to generate campaign.',
      },
      {
        status:
          500,
      }
    );
  }
}