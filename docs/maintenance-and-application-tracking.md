# Maintenance and seller application tracking

This change fixes maintenance state resolution and recovery, brands user-facing errors, and adds `/seller/application/track`.

## Maintenance

The server, public controls API and admin API now share path/flag normalization. Canonical page records take precedence over retired aliases. String `false` values do not enable maintenance. Manual maintenance and scheduled activity remain separate. Admin and API routes bypass public maintenance.

Persistent root layouts recheck maintenance every ten seconds and on focus/navigation, then refresh when their server decision changes. Turning maintenance OFF therefore releases an already-open maintenance screen. Failed status checks do not invent maintenance or clear an active screen. Health monitoring uses transactional checks so it cannot override a newer manual switch. AI maintenance fields now save through the admin API. Seller login, activation, tracking and workspace routes appear in the page manager.

## Tracking and corrections

Submission issues an unpredictable `AX-T-` tracking ID. The private resume lookup remains usable only to explain that an application was submitted and link to tracking. Earlier submitted drafts whose resume index was deleted can resolve their private code hash without exposing their form. Existing application IDs also work as legacy tracking references.

Tracking requires a matching recorded personal/business email and a six-digit emailed code. Unmatched references receive the same generic response. Codes expire after ten minutes, permit five attempts and can be consumed once. Email requests are throttled per application/email. Tracking sessions expire after thirty minutes, use random tokens kept only in browser memory and support explicit logout. The public response excludes internal screening, invitation secrets and account records.

Applicants can edit pending applications and respond to `changes_requested`. Emails, consent and approval fields cannot be edited through tracking. Admins can request corrections with a customer-visible message. Review operations check application revisions and state to avoid approving an older version while an applicant is editing. Submitted, review-started, correction-requested, corrected and rejected notifications use the existing mail service; approval retains the existing invitation email. A failed confirmation email does not undo submission, and the receipt tells the applicant to save their tracking ID.

Verified applicants can open AI support with a prefilled draft or open the contact/team request form with their details filled. Handoff data is kept in one-use session storage with a ten-minute expiry; email addresses and tracking-session tokens are not placed in support URLs. No message is sent until the applicant submits it.

## Operations and verification

Existing server credentials and mail configuration are required. Tracking shares `SELLER_APPLICATION_OTP_SECRET` or `AURONIX_VERIFY_SECRET` (minimum 24 characters). The following database paths are server-only and must not allow direct client access: `sellerApplicationTrackingIndex`, `sellerTrackingRate`, `sellerTrackingChallenges`, and `sellerTrackingSessions`. Existing application/draft permissions must remain protected. No database rules or live records were changed in this checkout. Expiry is enforced in the API even if expired records have not been removed. For efficient legacy resume lookup, index `sellerApplicationDrafts/resumeCodeHash` in deployed database rules.

Run backend regressions with `node --test tests/unit/maintenance-controls.cjs tests/unit/seller-submission.cjs tests/unit/seller-tracking.cjs`. Browser coverage is in `tests/e2e/application-tracking.spec.ts`, alongside the existing glass and public flow tests. Backend tests use an in-memory database and mail adapter; browser APIs use fixtures. Live database permissions, SMTP delivery and production deployment health require the configured deployment environment and were not certified locally.

Final local verification: TypeScript, lint and production build passed. Fourteen backend regressions passed, and all 34 desktop/mobile browser checks passed, including tracking/OTP/corrections, submitted-resume recovery, branded sign-in errors, contact/team/AI prefills, private metadata, 320/768/1440 tracking widths and the existing public/seller flows. Five existing lint warnings remain.
