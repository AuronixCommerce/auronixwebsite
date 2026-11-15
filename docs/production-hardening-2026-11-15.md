# Production hardening — 15 November 2026

## Corrected and reproduced

Fresh Firebase Admin processes can invoke a transaction with `null` even when the remote record exists. Aborting on that cache miss caused funded completions to return `insufficient_credits`, invoice changes to return conflicts, and webhook workers/configuration updates to stall.

Existing-record updates now propose a null no-op, allowing Firebase's compare-and-set retry to obtain the authoritative record. A genuinely absent record remains absent and is rejected after the transaction; no invoice, wallet, event or existing configuration is recreated from an earlier read. Version, lease ownership, pending-request state, payment quote and credit deduplication checks still run against server data.

Regression coverage exercises the API route through authentication, reserve, mocked provider, settlement and usage archive; provider failures and hold refunds; invoice instructions, reference submission and repeat approval; webhook configuration rotation, worker failure/retry and missing events; and deletion between invoice read and update. These are isolated tests, with no production credits or external messages created.

## Release checks

The application CI now covers all app/component/backend/test changes and pull requests, uses lockfile installation, and runs TypeScript, all Node regression tests and a production build. Existing seller checks remain included. Concurrent obsolete runs are cancelled; the workflow has read-only repository permissions.

## Remaining launch gates

- The dependency audit flags the installed Next.js 13 and other dependencies. This code patch alone does not resolve those advisories or certify production readiness. Framework/dependency migration needs its own complete build and runtime verification.
- Verify the private Firebase rules and indexes documented in `docs/aio-developer-api.md` in the actual deployed project; this workspace cannot attest to deployed rules.
- Complete the live test seller/developer lifecycle, promotional credit grant and metered request with the owned QA identity. The seller draft was email-verified and reached final review, but has not been submitted after the browser session restarted. No account access or credits were granted.
- Confirm production email/webhook retry scheduling and alert monitoring. Earlier live testing verified SMTP and one contact receipt, not every template or delivery destination.
