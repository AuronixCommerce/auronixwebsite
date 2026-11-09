# Auronix Commerce

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-8etxu78m)

## Production environment

Configure these values in Vercel for Preview and Production. Never commit mailbox or Firebase credentials.

- `NEXT_PUBLIC_SITE_URL=https://auronixcommerce.com`
- `APP_URL=https://auronixcommerce.com` (legacy server-side fallback)
- `SMTP_HOST` (for example, `smtp.hostinger.com`)
- `SMTP_PORT` (`465` for implicit TLS or `587` for STARTTLS)
- `SMTP_SECURE=true` for port 465; `false` for port 587
- `SMTP_USER` (the authenticated mailbox)
- `SMTP_PASSWORD` (the mailbox/app password)
- `MAIL_FROM=business@auronixcommerce.com`
- `MAIL_FROM_NAME=Auronix Commerce LLC`
- `MAIL_SUPPORT_EMAIL=business@auronixcommerce.com`
- `NEXT_PUBLIC_SUPPORT_EMAIL` (the public support address)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- Existing `NEXT_PUBLIC_FIREBASE_*` client/database values
- `GROQ_API_KEY`: optional model-assisted seller screening. Deterministic screening remains available when omitted and never auto-approves.

The SMTP provider must authorize `MAIL_FROM` for the authenticated domain. All transactional messages use that sender and reply to `MAIL_SUPPORT_EMAIL`.

After changing environment values, redeploy so server routes receive them.

## Security, operations, and newsletter environment

The production-hardening features use these additional Vercel variables:

- `ADMIN_MFA_SECRET`: long random secret used to hash admin email verification codes and sign protected admin sessions. When omitted, MFA enforcement is disabled to prevent accidental admin lockout.
- `CRON_SECRET`: Vercel cron bearer secret for page health, token cleanup, and backup jobs.
- `DATABASE_BACKUP_WEBHOOK_URL`: HTTPS receiver that stores the signed Firebase backup payload outside the primary database.
- `DATABASE_BACKUP_SECRET`: HMAC secret shared with the backup receiver. Falls back to `CRON_SECRET` only when omitted.
- `ERROR_ALERT_WEBHOOK_URL`: optional Slack/Teams/incident webhook for page-health and operational alerts.
- `EMAIL_WEBHOOK_SECRET`: HMAC secret used to verify email provider delivery, bounce, and complaint webhooks at `/api/webhooks/email-delivery`.
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile server secret.
- `TURNSTILE_ENFORCE=true`: enables mandatory Turnstile validation after the client widget/site key is configured. Rate limits and honeypot checks remain active without it.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public Turnstile site key for a future provider widget rollout.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: optional Google Analytics measurement ID. The script loads only after analytics consent.
- `SELLER_APPLICATION_OTP_SECRET`: long random secret for seller application email codes.
- `WHATSAPP_VERIFY_TOKEN`: server-only token used by Meta to verify `/api/webhooks/whatsapp`. This webhook is independent of seller application verification and does not enable WhatsApp OTP gating.

### Partner Deal Room and private documents

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=catalogs`

The bucket must remain private. Downloads are streamed only through the authenticated `/api/deal-room/files` route after application ownership or admin-session authorization.

### Installable app and optional notifications

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:business@auronixcommerce.com`
- `WHATSAPP_PHONE_NUMBER_ID` (optional)
- `WHATSAPP_ACCESS_TOKEN` (optional)
- `WHATSAPP_STATUS_TEMPLATE` (optional approved utility-template name)
- `WHATSAPP_API_VERSION=v25.0` (optional override)

WhatsApp is an opt-in status channel only. It is never used for verification, OTP delivery, identity checks, submission requirements, or seller-access gating. Email remains the default partner notification channel.

Configure the email provider to POST normalized delivery events to `/api/webhooks/email-delivery` and sign the raw JSON body with HMAC-SHA256 in `X-Auronix-Signature`. Supported event names are `sent`, `delivered`, `deferred`, `failed`, `bounced`, `complained`, `opened`, and `clicked`. Bounces and complaints automatically suppress the matching subscriber.

Vercel schedules page health every 15 minutes and security maintenance daily. The daily job deletes expired Auronix-managed seller drafts, invitations, newsletter confirmation/unsubscribe tokens, rate-limit buckets, and revoked admin sessions. Firebase Authentication password-reset codes are provider-managed and expire automatically; they are not stored in the application database.

The backup webhook must persist the request body in separate storage and verify `X-Auronix-Backup-Signature` and `X-Auronix-Backup-Checksum`. Each run writes a checksum, record counts, upload status, and JSON restoration verification to `backupManifests`.

## Verification

Run these commands before deployment:

```text
npm run typecheck
npm run build
npm run test:e2e
npm run test:a11y
npm audit
```

Install the browser runtime once on a new CI worker with `npx playwright install chromium`. End-to-end tests mock outbound email and account mutations; they do not write test records to production Firebase.

The included `vercel.json` selects the Next.js framework and schedules the
operational health and security-maintenance jobs.

### AIO 2 modes

The `/aio` page introduces the AIO 2 assistant experience. The chat selector offers AIO 2 (the configured primary model) and AIO 2 Fast (`aioFastModel`, default `openai/gpt-oss-20b`). These are branded modes over the configured provider, not newly trained foundation models. Provider credentials and model availability are required for live replies. Admin AI settings expose both model mappings. The selected mode is remembered with other chat preferences.

### Transcript delivery and mail checks

Chat's Email conversation action verifies the recipient with a six-digit, ten-minute, single-use code before sending the visible transcript. Requests and code attempts are limited; no marketing subscription is created. Set SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER and SMTP_PASSWORD (or SMTP_PASS) in the deployment environment. MAIL_FROM and MAIL_NOTIFICATION_EMAIL can configure authorized sender addresses. Use Admin → Email delivery → Test connection to verify server connectivity. SMTP acceptance is not proof of inbox delivery. Live delivery cannot be checked without deployment credentials.

AIO One is available in the chat header alongside AIO 2 and AIO 2 Fast. Its provider mapping is `aioOneModel` (default `openai/gpt-oss-20b`). One displays streamed text in small, paced chunks for easier reading; it does not intentionally slow provider inference. Stop cancels pacing immediately.
