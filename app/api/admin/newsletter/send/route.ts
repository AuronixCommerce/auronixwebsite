import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  requireAdmin,
} from '@/lib/server-auth';

import {
  sendNewsletterEmail,
} from '@/lib/server-newsletter';
import { writeAuditLog } from '@/lib/server-audit';
import { randomBytes } from 'crypto';

const WEBSITE =
  'https://auronixcommerce.com';

const SUPPORT_EMAIL =
  'business@auronixcommerce.com';

function clean(
  value: unknown,
  max = 20000
) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

function escapeHtml(
  value: string
) {
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

function wrapNewsletterHtml(
  html: string
) {
  const safeHtml =
    clean(
      html,
      50000
    );

  return `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>

<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111111;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f7;">
<tr>
<td align="center" style="padding:32px 14px;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">

<tr>
<td style="padding:28px 32px;border-bottom:1px solid #eeeeee;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>

<td>
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr>

<td style="width:42px;height:42px;background:#111111;border-radius:50%;text-align:center;vertical-align:middle;">
<span style="display:inline-block;width:14px;height:14px;background:#ffffff;border-radius:5px;"></span>
</td>

<td style="padding-left:12px;vertical-align:middle;">
<div style="font-size:18px;font-weight:800;letter-spacing:-0.03em;">
AURONIX
</div>

<div style="margin-top:3px;font-size:9px;font-weight:700;letter-spacing:2.5px;color:#888888;">
COMMERCE LLC
</div>
</td>

</tr>
</table>
</td>

<td align="right" valign="top">
<div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#f4f4f5;color:#71717a;font-size:9px;font-weight:700;letter-spacing:1.5px;">
NEWSLETTER
</div>
</td>

</tr>
</table>

</td>
</tr>

<tr>
<td style="padding:34px 32px 18px;">

${safeHtml}

</td>
</tr>

<tr>
<td style="padding:28px 32px;background:#fafafa;border-top:1px solid #eeeeee;">

<div style="font-size:14px;font-weight:700;">
Regards,
</div>

<div style="margin-top:6px;font-size:14px;font-weight:700;">
Auronix Commerce LLC
</div>

<div style="margin-top:4px;font-size:13px;color:#777777;">
eCommerce · Procurement · Marketplace Operations
</div>

<div style="margin-top:14px;font-size:13px;">
<a
href="${WEBSITE}"
style="color:#111111;text-decoration:none;font-weight:600;"
>
${WEBSITE}
</a>
</div>

<div style="margin-top:5px;font-size:13px;">
<a
href="mailto:${SUPPORT_EMAIL}"
style="color:#111111;text-decoration:none;"
>
${SUPPORT_EMAIL}
</a>
</div>

<div style="margin-top:18px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.7;color:#999999;">
You are receiving this email because you subscribed to
Auronix Commerce LLC updates.
</div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`.trim();
}

function buildPlainText(
  value: string
) {
  return clean(
    value
      .replace(
        /<br\s*\/?>/gi,
        '\n'
      )
      .replace(
        /<\/p>/gi,
        '\n\n'
      )
      .replace(
        /<[^>]+>/g,
        ''
      )
      .replace(
        /&nbsp;/g,
        ' '
      ),
    20000
  );
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

export async function POST(
  request: Request
) {
  try {
    const decoded = await requireAdmin(
      request
    );

    const body =
      await request.json();

    const subject =
      clean(
        body?.subject,
        200
      );

    const html =
      clean(
        body?.html,
        50000
      );

    const suppliedText =
      clean(
        body?.text,
        20000
      );

    if (!subject) {
      return NextResponse.json(
        {
          error:
            'Newsletter subject is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!html) {
      return NextResponse.json(
        {
          error:
            'Newsletter HTML is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!suppliedText) {
      return NextResponse.json(
        {
          error:
            'Newsletter plain-text content is required.',
        },
        {
          status: 400,
        }
      );
    }

    const subscribersSnapshot =
      await adminDb
        .ref(
          'newsletterSubscribers'
        )
        .get();

    const rawSubscribers =
      subscribersSnapshot.exists()
        ? subscribersSnapshot.val()
        : {};

    const subscribers =
      rawSubscribers &&
      typeof rawSubscribers ===
        'object'
        ? Object.values(
            rawSubscribers as Record<
              string,
              {
                  email?: unknown;
                  active?: unknown;
                  name?: unknown;
                  id?: unknown;
                  unsubscribeToken?: unknown;
              }
            >
          )
        : [];

    const activeSubscribers =
      subscribers.filter(
        (
          subscriber
        ) => {
          const email =
            clean(
              subscriber?.email,
              320
            );

          return (
            subscriber?.active ===
              true &&
            isValidEmail(
              email
            )
          );
        }
      );

    if (
      activeSubscribers.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            'There are currently no active newsletter subscribers.',
        },
        {
          status: 400,
        }
      );
    }

    const finalHtml =
      wrapNewsletterHtml(
        html
      );

    const finalText =
      buildPlainText(
        suppliedText
      );

    const campaignRef =
      adminDb
        .ref(
          'newsletterCampaigns'
        )
        .push();

    const campaignId =
      campaignRef.key ||
      `campaign-${Date.now()}`;

    const startedAt =
      Date.now();

    await campaignRef.set({
      id:
        campaignId,

      subject,

      type:
        'newsletter',

      status:
        'sending',

      createdAt:
        startedAt,

      startedAt,

      totalRecipients:
        activeSubscribers.length,

      sent:
        0,

      failed:
        0,
    });

    let sent = 0;
    let failed = 0;

    const failures: Array<{
      email: string;
      error: string;
    }> = [];

    /*
     * Send individually so one invalid subscriber
     * cannot stop the entire campaign.
     */
    for (
      const subscriber of activeSubscribers
    ) {
      const email =
        clean(
          subscriber?.email,
          320
        );

      const name =
        clean(
          subscriber?.name,
          200
        );

      try {
        const unsubscribeToken = clean(subscriber?.unsubscribeToken, 200) || randomBytes(32).toString('hex');
        if (!subscriber?.unsubscribeToken && subscriber?.id) await adminDb.ref(`newsletterSubscribers/${clean(subscriber.id, 200)}`).update({ unsubscribeToken, updatedAt: Date.now() });
        const delivery = await sendNewsletterEmail({ email, name, unsubscribeToken }, subject, html, suppliedText);

        sent +=
          1;

        await campaignRef.child('deliveries').push().set({ subscriberId: clean(subscriber?.id, 200), email, status: 'sent', providerMessageId: clean((delivery as any)?.messageId, 500), sentAt: Date.now(), updatedAt: Date.now() });
      } catch (
        error
      ) {
        failed +=
          1;

        failures.push({
          email,

          error:
            error instanceof Error
              ? userFacingError(error)
              : 'Unknown email error.',
        });

        await campaignRef.child('deliveries').push().set({ subscriberId: clean(subscriber?.id, 200), email, status: 'failed', error: error instanceof Error ? userFacingError(error).slice(0, 500) : 'Unknown email error.', failedAt: Date.now(), updatedAt: Date.now() });
      }

      await campaignRef.update({
        sent,
        failed,
      });
    }

    const completedAt =
      Date.now();

    const status =
      sent > 0 && failed === 0
        ? 'completed'
        : sent > 0
          ? 'completed-with-errors'
          : 'failed';

    await campaignRef.update({
      status,

      completedAt,

      sent,

      failed,

      totalRecipients:
        activeSubscribers.length,

      failures:
        failures.length > 0
          ? failures
          : null,
    });

    await writeAuditLog({ actorUid: decoded.uid, actorEmail: decoded.email || '', action: 'NEWSLETTER_CAMPAIGN_SENT', targetType: 'newsletterCampaign', targetId: campaignId, summary: `Newsletter sent to ${sent} subscriber(s); ${failed} failed.`, metadata: { subject, sent, failed }, request });

    return NextResponse.json({
      success:
        true,

      campaignId,

      sent,

      failed,

      totalRecipients:
        activeSubscribers.length,

      status,
    });
  } catch (
    error
  ) {
    console.error(
      '[Newsletter Send]',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to send newsletter.',
      },
      {
        status:
          error instanceof Error &&
          /admin|unauthorized|forbidden/i.test(
            error.message
          )
            ? 403
            : 500,
      }
    );
  }
}
