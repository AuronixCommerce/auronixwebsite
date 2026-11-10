# Application screening, email delivery, AIO workspace and status

## Deployment

This Next.js repository includes both Vercel and Netlify deployment configurations. Vercel reports production deployments through the repository's commit status. The Netlify-only function `netlify/functions/operations-tick.mjs` runs every minute on published Netlify deployments; it does **not** execute on Vercel.

Queued chat OTPs now retry while the customer keeps the verification panel open. The panel checks only its own verification job every 30 seconds, and the server enforces retry backoff, ownership and expiry. This works on Vercel without a Netlify timer. Closed-browser email retries and unattended offline-support processing still require a scheduler calling `/api/cron/email-queue` and `/api/cron/offline-support` with `Authorization: Bearer <CRON_SECRET>`. Set **CRON_SECRET** in the hosting environment and use a schedule supported by the host or an external authenticated scheduler. The existing Vercel configuration schedules health and security maintenance only; it is not a minute-by-minute email/support scheduler.

Existing Firebase Admin credentials, Firebase Auth configuration, SMTP credentials and GROQ_API_KEY remain required. SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (or `SMTP_PASS`), `MAIL_FROM`, and optionally `MAIL_NOTIFICATION_EMAIL` and `MAIL_SUPPORT_EMAIL`. Admin → Email delivery → Test connection validates the deployed SMTP connection without sending a customer message.

Queue bodies and attachments are AES-256-GCM encrypted using EMAIL_QUEUE_KEY, or a key derived from FIREBASE_ADMIN_PRIVATE_KEY when EMAIL_QUEUE_KEY is absent. If using a separate EMAIL_QUEUE_KEY, keep it stable across deploys; rotating it invalidates pending encrypted jobs. The original emails are never returned by the admin delivery API. New database collections must remain inaccessible to direct public/client writes: emailQueue, emailAlerts, workerHealth, sellerScreeningLeases, aioKnowledgeDocuments, aioKnowledge, serviceStatus and aioConversations. Their application APIs enforce admin approval or account ownership. Merge these restrictions with your existing Firebase Realtime Database rules; do not replace existing application rules with a blanket rule.

## Email delivery

Mail is persisted before SMTP submission. If a password reset is queued after an SMTP failure, the server immediately tries Firebase recovery delivery, pausing the queued SMTP job during that attempt. A successful fallback cancels the queued reset; a failed fallback leaves it available for retry. Temporary failures create admin alerts, then retry after 1, 2, 4, 8 and 16 minutes, with a maximum of six attempts. Security messages have a shorter retry lifetime; expired messages are never sent. Accepted SMTP messages show **sent**, not **delivered**. Attachments and email bodies are removed after SMTP acceptance or terminal failure. Leases prevent concurrent workers from submitting the same job; a stable Message-ID and optional idempotency key further reduce duplicates. SMTP cannot guarantee exactly-once delivery after ambiguous connection failures.

Admin → Email delivery displays queue status, attempts, next retry, failures and worker heartbeat. The admin workspace also shows delivery alerts. A manual retry can advance a pending job after fixing SMTP settings. Expired or permanently rejected emails require a fresh customer request.

Provider delivery events use the existing HMAC webhook `/api/webhooks/email-delivery` and EMAIL_WEBHOOK_SECRET. The body must carry a supported event and the SMTP messageId. Providers without signed delivery webhooks cannot provide confirmed delivery/open events. No delivery success is fabricated.

## Screening and offline support

Seller screening runs one pending application per request; the admin client continues remaining work. A lease prevents duplicate reviews. Model failures save a deterministic fallback for manual review. Final decisions and applications awaiting corrections are protected. Merely opening the application page does not approve or invite applicants. Existing optional automatic onboarding also requires the server-side `settings/ai/autoOnboardingEnabled` flag to be explicitly true.

Admin availability can be set in Tickets. Explicit Offline is respected. Online heartbeat expires after five minutes without an active admin page (after online mode is set). AI → Offline auto replies and Continue ticket conversations control the worker. New tickets and customer follow-ups are processed even when the admin browser is closed. Each customer turn receives at most one stored automated reply. The worker rechecks for newer messages and human replies before saving. If the AI provider is unavailable it sends a clearly identified receipt acknowledgement, without inventing a resolution. Messages remain open/in progress for human review.

Public follow-ups require a random reply token returned when the ticket is created, rather than just a guessable email address. Keep the support conversation page open for guest follow-ups; replies from the team also arrive by email.

## Saved AIO workspace

`/aio/chat` includes account-scoped search (titles and message content), rename, saved answer pins and cross-device history. Sign in and leave Chat memory enabled. Anonymous browser history remains separate. Opening a saved conversation resumes its account conversation ID. Disabling memory stops future account saves; previous account records remain available through the saved workspace. Clearing browser memory does not delete account history.

## Approved PDFs

Admin → Knowledge Library accepts searchable PDFs up to 3 MB / 60 pages. Text extraction is limited to 120,000 characters. Image-only scans must be OCR processed before upload. New uploads are pending and excluded from AIO. Review extracted text and audience, then approve. Approval publishes every reviewed text chunk with a source link. A source may be public or limited to signed-in accounts. **The original PDF is downloadable to the selected audience**, even when reviewed text is edited. Withdrawing a source removes its retrieval chunks and disables its download link. Pending, withdrawn and unreviewed legacy knowledge records are excluded.

## Public service status

`/status` remains reachable during website maintenance. Admin → Service Status publishes service conditions, incidents, progress updates and maintenance windows. Existing global website/AIO maintenance controls appear automatically. Services initially show no published status; this is a staff-reported page, not an uptime monitor. Private audit and admin fields are never included in the public API.

## Verification

Run `node --test tests/unit/*.cjs`, `npm run typecheck`, and `npm run build`. Tests cover queue encryption/leases/expiry, provider outages, cross-account isolation, search/rename/pins, approval/audience enforcement, PDF text extraction, public status redaction and support reply races. Live SMTP/provider delivery and authenticated production workflows require the deployed credentials and cannot be proved by local unit tests.
