# Real-glass interface review

Baseline: 05b165094443d342db2409302d166ce8bc800a1b.

Rebuilt public masthead, material hierarchy, form surfaces, supplier guide, seller application, accessible resume dialog, login compositions, and admin/seller workspace shell. Desktop sidebars, tablet icon rails, and mobile action docks share the material language. Includes translucent edge highlights, fine grain, diffusion, shadows, dark theme, reduced motion, and opaque fallback.

Removed all four seller WhatsApp endpoints, the verification helper, client state and requests, draft/submission gates, stored verification fields on new applications, dashboard status, and obsolete help/AI copy. Existing records are not migrated or deleted. Email verification, consent, draft credentials, duplicate checks, access roles and admin sessions remain enforced. The former help URL redirects permanently to email guidance. Public WhatsApp social/contact links remain because they are not verification.

Email verification now uses SELLER_APPLICATION_OTP_SECRET or AURONIX_VERIFY_SECRET (at least 24 characters). The retired WhatsApp secret is no longer a fallback. Confirm the email-specific variable before deployment; pending email codes created with a different secret require a fresh code.

Verification completed on 2026-09-13:

- TypeScript, lint and production build pass. Five pre-existing lint warnings remain.
- 22 desktop/mobile Chromium checks pass: seller and supplier submission, email gating, resume dialog, activation, password reset, newsletters, FAQ, help, AI local memory and 12 public route metadata/viewport checks.
- Additional 320/768/1440 checks pass for search, supplier/application/login layouts and unauthenticated admin/seller redirects. Fixed the supplier guide's minimum grid width after the 320px test exposed overflow.
- Admin and seller workspace presentation fixtures fit 320/390/768/1440 widths.
- Three real route-handler tests with an in-memory Firebase adapter pass: draft/email/resume/submission, invalid and expired credentials, duplicate submission and legacy drafts. No WhatsApp field or request is required. Run with `node --test tests/unit/seller-submission.cjs`.

Browser form APIs are mocked; backend tests replace only external Firebase/mail/protection adapters. Production build uses synthetic Firebase client configuration with E2E_TEST=1 solely in the local process. Live Firebase Admin, email delivery, uploads, Groq and authenticated production writes cannot be certified without project credentials. No live records were created or changed. These limits are distinct from the passing local checks.

The user explicitly authorized publishing these changes to GitHub main. Hosting deployment and production service health must be checked in the deployment environment.
