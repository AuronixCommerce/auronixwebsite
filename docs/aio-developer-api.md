# AIO developer API

Public page: `/aio/developers`. Account console: `/aio/developers/console`.
Admin operations: `/admin/developers` (existing administrator + MFA protection).

## Launch

The user-authorized launch defaults enable the API at 1 credit = US$1, AIO One/Fast US$0.25 input and US$1 output per million tokens, and AIO 2 US$0.50 input and US$2 output per million tokens. Wallets still start at zero and require admin approval and verified payment or an authorized grant. Explicit nonzero admin pricing and pause settings are preserved; legacy unpublished zero-price settings use the launch defaults.

1. Use the existing production Firebase Auth and Firebase Admin configuration. Email/password registration and Firebase email-verification action links must be enabled. The verification continuation URL must allow `https://auronixcommerce.com/aio/developers/console`.
2. Merge the private-node rules and `expiresAt` index from `docs/firebase/developer-api-rules.fragment.json` into the deployed Realtime Database rules. This is a merge fragment, not a replacement for the site's complete rules. Remove any permissive parent/root grants covering these paths: Firebase child `false` rules cannot override a parent `true`. These nodes are only accessed through Admin SDK routes; clients must have no direct read/write access. Existing seller/admin rules must be preserved. Rules were not deployed from this workspace.
3. Confirm existing `GROQ_API_KEY` and the models configured in `settings/ai`. Public AIO aliases route through `resolveAioModel`, using the existing `GROQ_MODEL`/default where appropriate. API v1 generates text; it cannot run customer actions or access business/admin records.
4. Confirm existing notification email sender configuration, retry worker, and `CRON_SECRET` for `/api/cron/security-maintenance`. That existing cron now removes up to 500 expired API request claims per run; monitor backlog if traffic warrants more frequent processing.
5. In the admin API page, review or change launch rates and the shared request limit. Enabling pricing allows API/invoice requests. Pausing blocks new paid requests without altering existing wallet balances. Review selling rates against actual upstream costs before enabling.

No Vercel project or production secrets were changed by this release. Live Firebase/Groq/email operations require the existing production credentials and were not exercised locally.

## Account lifecycle

Firebase registration → email verification through existing professional-mail delivery → use-case application → pending → admin approval/rejection/suspension. Approval is separate from Firebase roles; the developer application cannot create an administrator or seller role. Each decision records an audit entry and attempts a status email. Decision notes are visible to the applicant.

Keys are generated with cryptographic random bytes, revealed once, and stored as SHA-256 hashes in a private index. Key metadata is separate and paginated. There is no lifetime key limit; create/revoke actions are throttled. Suspended accounts can revoke existing keys but cannot create keys or call models. All keys share account balance, 1–300 configured requests/minute, and a five-request concurrency limit. Firebase-disabled/unverified users and revoked keys are rejected.

## Billing

This release uses **manual invoice billing**, not online card checkout. A developer accepts current API billing terms and requests at least 5 whole credits; the server locks the USD quote. Staff send their actual payment instructions through the admin invoice review. The customer submits a transfer reference in Billing. Admins verify the actual received USD amount against the exact quote and approve the credit addition. The request moves through requested → awaiting_payment → payment_submitted → approving → credited; staff can request more information or reject, and customers can cancel unpaid requests. No bank destination is invented or prefilled. Explicitly authorized promotional grants can use the same audited flow. Never grant credits merely because an invoice was requested. Receipt references are claimed across accounts in the private aioDeveloperPaymentReferences collection; invoice IDs and credits are deduplicated in the atomic wallet. Interrupted approval can be resumed with the same locked receipt without adding credits twice. The developer sees quotes, statuses, balances, additions, and usage.

Stripe was discovered as an available provider, but no payment-provider account is connected and the Vercel CLI requested login. No fake checkout, test-mode live purchases, or unverified payment crediting was added. Automatic card payments remain a separate account-connection step; use a signed server-side paid-payment event and payment-ID deduplication when connecting one.

Credit amounts are integers internally: 1 credit = 1,000,000 units. A request reserves a conservative maximum based on UTF-8 input bytes, message overhead, output cap, and a locked rate snapshot. Only provider-reported successful usage is charged. Each input/output charge rounds up separately to the nearest internal unit. Failures release the hold. No answer is returned if settlement cannot commit.

Wallet transactions serialize holds, balance changes, grants, and account request counters. Idempotency claims use independent per-request transactions with 24-hour expiry. Completed records move atomically from the hot wallet to the owner usage history, ordered by creation time. An archive failure leaves the terminal record for recovery. Interrupted holds expire after two minutes and recover on the next wallet/API transaction. A retry using the same Idempotency-Key returns 409; answers are not stored or replayed. After a network timeout, check usage before sending a new key. A response lost after settlement remains a completed billed request.

The grant record in the wallet is the authoritative immutable credit audit. If finalization fails after a credit grant, retry approval with the originally locked receipt and amount; the recorded grant is reused and the invoice finalizes without adding credits twice. Invoice requests are quotes/requests, not tax invoices. No refund/cash-out automation or currency collection is implemented.

## API

- `GET /api/aio/v1/models`
- `POST /api/aio/v1/chat/completions`

Authorization: `Bearer aio_live_…`. Text messages only, max 32 messages and 16 KB UTF-8 content, max completion 4,096 tokens. Non-streaming. Only documented parameters are accepted. Full examples and errors are on the public page. This is an OpenAI-style response shape, not a claim of complete OpenAI SDK compatibility.

Responses include exact provider token counts, `billing.charged_units`, `units_per_credit`, `available_units`, and `X-Request-ID`. Usage history stores model, tokens, rate snapshot, charge, status, key ID, and timing; prompts and answers are not retained. No API keys or upstream credentials appear in usage records.

## Validation

`node --test tests/unit/*.cjs`, `npm run typecheck`, `npm run build`.
Tests cover owner isolation, verification and approval gates, one-time secrets, key revocation, rate/concurrency limits, shared-wallet overspend prevention, duplicate request/payment protection, actual token settlement, refunds, recovery, invoice quote integrity, and usage pagination. Production card payment, live model billing, live signups, and actual email delivery cannot be verified without the connected production services.

## Playground and API Terms

`/aio/developers/console?tab=playground` provides a live text API test. Its same-origin Firebase-authenticated route `/api/developers/playground` calls the exact metered completion executor used by API-key requests. It cannot bypass account approval, current-terms acceptance, credit balance, rate limits, concurrency, or idempotency. It mints no browser API secret. The response exposes actual text, tokens, charged credits and request ID.

Current terms: `/aio/developers/terms`, with a branded offline PDF; website Terms and Privacy include API supplements and PDF summaries. New applications and payment requests record the version; old accounts explicitly accept the updated API Terms before continued generation. No paid request or transfer was made during development.
