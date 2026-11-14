import { emailShell, emailEscape, emailLogoAttachment } from "@/lib/email/design";
import nodemailer from 'nodemailer';
import crypto from 'crypto';

import { adminDb } from '@/lib/firebase-admin';
import { sendNewsletterOptInEmail } from '@/lib/server-mail';

const SMTP_HOST =
  process.env.SMTP_HOST ||
  'smtp.gmail.com';

const SMTP_PORT =
  Number(
    process.env.SMTP_PORT ||
      587
  );

const SMTP_USER =
  process.env.SMTP_USER ||
  '';

const SMTP_PASSWORD =
  process.env.SMTP_PASSWORD ||
  '';

const SUPPORT_EMAIL =
  process.env.MAIL_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  SMTP_USER ||
  '';

const WEBSITE =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.AURONIX_WEBSITE ||
  'https://auronixcommerce.com';

function requireMailConfig() {
  if (
    !SMTP_USER ||
    !SMTP_PASSWORD
  ) {
    throw new Error(
      'Email service is not configured.'
    );
  }
}

function createTransport() {
  requireMailConfig();

  return nodemailer.createTransport({
    host:
      SMTP_HOST,

    port:
      SMTP_PORT,

    secure:
      SMTP_PORT ===
      465,

    auth: {
      user:
        SMTP_USER,

      pass:
        SMTP_PASSWORD,
    },
  });
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

function makeToken(): string {
  return crypto
    .randomBytes(32)
    .toString('hex');
}

export function normalizeNewsletterEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

export function isValidNewsletterEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export async function subscribeToNewsletter(
  email: string,
  name = '',
  source = 'footer'
) {
  const normalized = normalizeNewsletterEmail(email);
  if (!isValidNewsletterEmail(normalized)) throw new Error('Please enter a valid email address.');
  const subscribersRef = adminDb.ref('newsletterSubscribers');
  const snapshot = await subscribersRef.get();
  const records = snapshot.exists() ? snapshot.val() as Record<string, Record<string, unknown>> : {};
  const match = Object.entries(records).find(([, record]) => normalizeNewsletterEmail(String(record.email || '')) === normalized);
  const existingId = match?.[0] || '';
  const existingRecord = match?.[1] || null;
  if (existingRecord?.active === true) return { success: true, alreadySubscribed: true, confirmationRequired: false };

  const now = Date.now();
  const id = existingId || subscribersRef.push().key;
  if (!id) throw new Error('Unable to create newsletter subscription.');
  const confirmationToken = makeToken();
  const confirmationTokenHash = crypto.createHash('sha256').update(confirmationToken).digest('hex');
  const confirmationExpiresAt = now + 24 * 60 * 60 * 1000;
  const unsubscribeToken = String(existingRecord?.unsubscribeToken || makeToken());
  await subscribersRef.child(id).update({
    id,
    email: normalized,
    name: name.trim() || String(existingRecord?.name || ''),
    active: false,
    suppressed: false,
    pendingConfirmation: true,
    confirmationTokenHash,
    confirmationExpiresAt,
    confirmationRequestedAt: now,
    source: source || 'footer',
    unsubscribeToken,
    frequency: String(existingRecord?.frequency || 'weekly'),
    topics: existingRecord?.topics || { company: true, sourcing: true, sellers: true, suppliers: true },
    updatedAt: now,
    createdAt: Number(existingRecord?.createdAt || now),
  });
  await adminDb.ref(`newsletterConfirmationIndex/${confirmationTokenHash}`).set({ subscriberId: id, expiresAt: confirmationExpiresAt });
  await sendNewsletterOptInEmail({ email: normalized, confirmationUrl: `${WEBSITE.replace(/\/$/, '')}/newsletter/confirm?token=${encodeURIComponent(confirmationToken)}`, expiresAt: confirmationExpiresAt });
  return { success: true, alreadySubscribed: false, confirmationRequired: true };
}

export async function unsubscribeFromNewsletter(
  token: string
) {
  const cleanToken =
    token.trim();

  if (
    !cleanToken
  ) {
    throw new Error(
      'Invalid unsubscribe token.'
    );
  }

  const snapshot =
    await adminDb
      .ref(
        'newsletterSubscribers'
      )
      .get();

  if (
    !snapshot.exists()
  ) {
    return {
      success:
        false,
      found:
        false,
    };
  }

  const records =
    snapshot.val() as Record<
      string,
      Record<
        string,
        unknown
      >
    >;

  for (
    const [
      id,
      record,
    ] of Object.entries(
      records
    )
  ) {
    if (
      String(
        record.unsubscribeToken ||
          ''
      ) ===
      cleanToken
    ) {
      await adminDb
        .ref(
          `newsletterSubscribers/${id}`
        )
        .update({
          active:
            false,

          unsubscribedAt:
            Date.now(),

          updatedAt:
            Date.now(),
        });

      return {
        success:
          true,

        found:
          true,
      };
    }
  }

  return {
    success:
      false,

    found:
      false,
  };
}

function buildUnsubscribeUrl(
  token: string
): string {
  return `${WEBSITE.replace(
    /\/$/,
    ''
  )}/newsletter/unsubscribe?token=${encodeURIComponent(
    token
  )}`;
}

export function ensureNewsletterHtml(html: string, unsubscribeUrl: string, preferencesUrl: string, subject = "Auronix Journal") {
  const content = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  const styles = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)?.join("") || "";
  return emailShell({
    preheader: subject, title: subject, category: "AURONIX JOURNAL",
    body: `${styles}${/<h1\b/i.test(content) ? "" : `<h1>${emailEscape(subject)}</h1>`}${content}`,
    footerNote: "You are receiving this email because you subscribed to Auronix Commerce updates.",
    footerHtml: `<p style="margin:0 0 14px"><a href="${emailEscape(preferencesUrl)}" style="color:#393e47;text-decoration:underline">Manage preferences</a> &nbsp;&middot;&nbsp; <a href="${emailEscape(unsubscribeUrl)}" style="color:#393e47;text-decoration:underline">Unsubscribe</a></p>`,
  });
}

export async function sendNewsletterEmail(
  subscriber: {
    email: string;
    name?: string;
    unsubscribeToken: string;
  },
  subject: string,
  html: string,
  text: string
) {
  const transport =
    createTransport();

  const unsubscribeUrl =
    buildUnsubscribeUrl(
      subscriber.unsubscribeToken
    );

  const preferencesUrl = `${WEBSITE.replace(/\/$/, '')}/newsletter/preferences?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;

  const personalizedHtml =
    html.replace(
      /\{\{\s*name\s*\}\}/gi,
      escapeHtml(
        subscriber.name ||
          'there'
      )
    );

  const wrappedHtml =
    ensureNewsletterHtml(
      personalizedHtml,
      unsubscribeUrl,
      preferencesUrl,
      subject
    );

  return transport.sendMail({
    from:
      `"${process.env.MAIL_FROM_NAME || 'Auronix Commerce LLC'}" <${process.env.MAIL_FROM || SMTP_USER}>`,

    to:
      subscriber.email,

    replyTo:
      SUPPORT_EMAIL,

    subject:
      subject.trim(),

    text:
      `${text.trim()}\n\nManage preferences: ${preferencesUrl}\nUnsubscribe: ${unsubscribeUrl}`,

    html:
      wrappedHtml,

    attachments: [emailLogoAttachment()],
  });
}

export async function sendNewsletterToSubscribers(
  subject: string,
  html: string,
  text: string,
  options?: {
    campaignId?: string;
    sendLimit?: number;
  }
) {
  if (
    !subject.trim() ||
    !html.trim() ||
    !text.trim()
  ) {
    throw new Error(
      'Newsletter subject and content are required.'
    );
  }

  const snapshot =
    await adminDb
      .ref(
        'newsletterSubscribers'
      )
      .get();

  if (
    !snapshot.exists()
  ) {
    return {
      total:
        0,

      sent:
        0,

      failed:
        0,
    };
  }

  const records =
    snapshot.val() as Record<
      string,
      Record<
        string,
        unknown
      >
    >;

  const activeSubscribers =
    Object.entries(
      records
    )
      .filter(
        ([, record]) =>
          record.active ===
          true &&
          isValidNewsletterEmail(
            normalizeNewsletterEmail(
              String(
                record.email ||
                  ''
              )
            )
          )
      )
      .map(
        ([id, record]) => ({
          id,

          email:
            normalizeNewsletterEmail(
              String(
                record.email
              )
            ),

          name:
            String(
              record.name ||
                ''
            ),

          unsubscribeToken:
            String(
              record.unsubscribeToken ||
                ''
            ),
        })
      );

  const limit =
    options?.sendLimit &&
    options.sendLimit > 0
      ? Math.min(
          options.sendLimit,
          activeSubscribers.length
        )
      : activeSubscribers.length;

  let sent =
    0;

  let failed =
    0;

  const failures:
    Array<{
      email: string;
      error: string;
    }> =
    [];

  for (
    const subscriber of
    activeSubscribers.slice(
      0,
      limit
    )
  ) {
    try {
      await sendNewsletterEmail(
        subscriber,
        subject,
        html,
        text
      );

      sent +=
        1;

      await adminDb
        .ref(
          `newsletterSubscribers/${subscriber.id}`
        )
        .update({
          lastEmailSentAt:
            Date.now(),

          updatedAt:
            Date.now(),
        });
    } catch (
      error
    ) {
      failed +=
        1;

      failures.push({
        email:
          subscriber.email,

        error:
          error instanceof Error
            ? error.message
            : 'Unknown email error.',
      });
    }
  }

  if (
    options?.campaignId
  ) {
    await adminDb
      .ref(
        `newsletterCampaigns/${options.campaignId}`
      )
      .update({
        completedAt:
          Date.now(),

        totalRecipients:
          activeSubscribers.length,

        sent,

        failed,

        failures,

        status:
          failed > 0 &&
          sent === 0
            ? 'failed'
            : 'sent',

        updatedAt:
          Date.now(),
      });
  }

  return {
    total:
      activeSubscribers.length,

    sent,

    failed,

    failures,
  };
}

export async function notifyNewsletterSubscribersOfSiteUpdate(
  title: string,
  summary: string,
  url: string,
  updateType:
    | 'terms'
    | 'privacy'
    | 'disclaimer'
    | 'cookies'
    | 'seller-policy'
    | 'website-update'
) {
  const subjects: Record<
    typeof updateType,
    string
  > = {
    terms:
      'Auronix Commerce — Terms of Service Update',

    privacy:
      'Auronix Commerce — Privacy Policy Update',

    disclaimer:
      'Auronix Commerce — Disclaimer Update',

    cookies:
      'Auronix Commerce — Cookie Policy Update',

    'seller-policy':
      'Auronix Commerce — Seller Policy Update',

    'website-update':
      'Auronix Commerce — Website Update',
  };

  const subject =
    subjects[
      updateType
    ];

  const html = `
    <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">
      Important website update
    </h1>

    <p style="font-size:16px;line-height:1.7;margin:0 0 18px;">
      {{name}}, we’ve updated an Auronix Commerce page that may be relevant to you.
    </p>

    <div style="padding:18px;background:#f5f5f7;border-radius:16px;margin:20px 0;">
      <div style="font-weight:700;font-size:17px;">
        ${escapeHtml(title)}
      </div>

      <p style="margin:8px 0 0;font-size:14px;line-height:1.7;">
        ${escapeHtml(summary)}
      </p>
    </div>

    <a
      href="${url}"
      style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600;"
    >
      Review the Update
    </a>
  `;

  const text =
    `Auronix Commerce website update\n\n${title}\n\n${summary}\n\nReview: ${url}`;

  const campaignRef =
    adminDb
      .ref(
        'newsletterCampaigns'
      )
      .push();

  const campaignId =
    campaignRef.key;

  if (!campaignId) {
    throw new Error(
      'Unable to create newsletter campaign.'
    );
  }

  await campaignRef.set({
    id:
      campaignId,

    type:
      'site-update',

    updateType,

    subject,

    title,

    summary,

    url,

    createdAt:
      Date.now(),

    status:
      'sending',
  });

  return sendNewsletterToSubscribers(
    subject,
    html,
    text,
    {
      campaignId,
    }
  );
}
