# Partner operations

## Public routes

- `/supplier`: required/optional checklist, CSV and XLSX catalog preview/editor, secure save and restore. Files must be reselected after restoring a draft; contact consent must be given again.
- `/supplier/track`: email-verified applications, public review timeline, requested document uploads, replies, saved drafts, calls, and support requests.
- `/notifications`: the same verified workspace opened on notifications.
- `/partnership-call`: published availability, time-zone selection, verified booking, calendar export, and cancellation via the workspace.
- `/guides`: searchable video/written guide library. AIO retrieval includes relevant guide links.
- `/company-verification`: consumes both legacy and current business settings, with factual fallback information.
- Feedback is available on public pages; contact details are only stored when a visitor opts in.

## Administrator setup

Open `/admin/operations` (Partner Operations in navigation) to review suppliers and their timeline; request documents; send editable templated replies; record internal notes; manage templates; publish/cancel call slots; review feedback; and view consented funnel/video analytics. No availability is fabricated: publish real times before customers can book. Meeting links are optional, private to booked customers and administrators. Existing supplier and ticket tools remain available.

## Dependencies and access

Reuses the existing Firebase Admin, mail retry queue, R2 private storage, administrator auth/MFA, and optional Turnstile configuration. No new service subscription or new secret is required. Sessions are opaque, hashed in the database, HttpOnly, SameSite=Lax, Secure in production, and expire after seven days. Codes expire after ten minutes, permit five verification attempts, and cannot be replayed. Mutation endpoints check same origin; private records are matched to the verified email. Internal notes and storage keys are excluded from customer responses.

New database roots accessed only by server routes: `partnerChallenges`, `partnerSessions`, `partnerEmailLimits`, `partnerRateLimits`, `partnerNotifications`, `supplierDrafts`, `partnershipSlots`, `partnershipBookings`, `websiteFeedback`, and `siteInsights`. Keep these roots denied to browser clients in the deployed Firebase rules; do not enable public root reads/writes. Existing `suppliers` and `tickets` continue to use the established admin permissions. Recommended query indexes: `suppliers.email`, `tickets.email`, `partnershipBookings.email`, `partnershipSlots.startsAt`.

AIO handoff is an opt-in part of the existing email-verified support action. Its bounded user/assistant transcript and deterministic issue summary are saved only with consent, shown during review, and available in the admin ticket. Chat messages are labeled unverified customer-shared text.

## Analytics and catalogs

Analytics is disabled unless the visitor has opted in. The server checks the analytics consent cookie. Events contain only whitelisted event/section/video/route names and daily hashed session identifiers; no form values, email, references, or chat content. The dashboard counts incomplete measured sessions, not proven abandonment.

Inline preview accepts CSV and XLSX up to 5 MB, 5,000 data rows and 40 columns. Legacy XLS can still be uploaded, with conversion to CSV/XLSX requested for preview. Required column checks cover SKU, product name and price. Reviewed CSVs preserve values from the selected sheet only, neutralize spreadsheet formulas, and do not overwrite the original file.

## Verification

The route tests cover email ownership, OTP expiry/lockout/replay, draft sanitization, internal-note/storage-key filtering, cross-origin mutations, booking conflicts/ownership, admin-only operations, analytics consent/metadata, catalog parsing/export, and consented AIO transcript handoff. Production mail and storage still require the deployment’s existing credentials. Local UI preview does not contain live Firebase Admin or mail credentials.
