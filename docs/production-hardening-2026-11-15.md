# Production hardening — 15 November 2026

## Corrected and reproduced

Fresh Firebase Admin processes can invoke a transaction with `null` even when the remote record exists. Aborting on that cache miss caused funded completions to return `insufficient_credits`, invoice changes to return conflicts, and webhook workers/configuration updates to stall.

Existing-record updates now propose a null no-op, allowing Firebase's compare-and-set retry to obtain the authoritative record. A genuinely absent record remains absent and is rejected after the transaction; no invoice, wallet, event or existing configuration is recreated from an earlier read. Version, lease ownership, pending-request state, payment quote and credit deduplication checks still run against server data.

Regression coverage exercises the API route through authentication, reserve, mocked provider, settlement and usage archive; provider failures and hold refunds; invoice instructions, reference submission and repeat approval; webhook configuration rotation, worker failure/retry and missing events; and deletion between invoice read and update. These are isolated tests, with no production credits or external messages created.

## Release checks

The application CI now covers all app/component/backend/test changes and pull requests, uses lockfile installation, and runs TypeScript, all Node regression tests and a production build. Existing seller checks remain included. Concurrent obsolete runs are cancelled; the workflow has read-only repository permissions.

## Remaining launch gates

- Review the 15 remaining moderate dependency advisories; the latest production audit reports zero high and zero critical findings. Audit results are time-sensitive and do not establish exploitability or complete security assurance.
- Verify the private Firebase rules and indexes documented in `docs/aio-developer-api.md` in the actual deployed project; this workspace cannot attest to deployed rules.
- Complete the live test seller/developer lifecycle, promotional credit grant and metered request with the owned QA identity. The seller draft was email-verified and reached final review, but has not been submitted after the browser session restarted. No account access or credits were granted.
- Confirm production email/webhook retry scheduling and alert monitoring. Earlier live testing verified SMTP and one contact receipt, not every template or delivery destination.

## Framework and dependency follow-up

Migrated Next.js 13.5.11 to 15.5.29 and the matching ESLint configuration. Server request cookies/headers and dynamic route parameters are awaited; client dynamic pages use `useParams`. Updated maintenance search parameters and moved tracing/external-package options to their supported configuration locations.

Updated Nodemailer to 10.1.4, Zod to 4.6.7 and ESLint to the compatible 8.57.1 patch; refreshed compatible lockfile dependencies. Explicit overrides use the existing patched PostCSS 8.5.23 and gRPC 1.13.6 to avoid vulnerable nested versions. All 184 backend regressions pass after these changes, including mail, OTP, account actions and billing. CI rejects high/critical production dependency advisories. This gate does not automatically configure Vercel branch protection.

No user credentials, production environment variables, Firebase rules, real payments or account approvals were changed.
