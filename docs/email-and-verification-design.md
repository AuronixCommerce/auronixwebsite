# Email and verification design

`VerificationCode` is the shared six-digit control for AIO actions, chat transcripts, supplier access, seller applications/tracking, admin MFA and newsletter confirmation. It keeps one native input for keyboard navigation, autofill and paste. ASCII, Arabic and Persian digits normalize through the existing verification-code utility. The cells, label and hint resize within the available width; chat confirmation controls stack on narrow screens. Verification and server-side authorization rules are unchanged.

`lib/email/design.ts` owns the responsive email frame, action buttons, code cards, plain-message formatting and the original O artwork. The logo is embedded as a small PNG attachment with a content ID; company identity remains readable as text when a client hides images. The asset derives from the original artwork in `public/auronix-signature.jpeg`.

The SMTP delivery boundary brands transactional messages, including custom admin HTML and older queued email, without wrapping the new frame twice. Original attachments and threading headers remain intact. Newsletter campaigns use the same frame and retain personalized content, preference links and unsubscribe links. Transcript emails keep rich message formatting, the private PDF link and PDF attachment.

The emergency Firebase-managed password-reset fallback is sent by Firebase, so its provider-owned template must be changed in the Firebase console. This repository changes all application-generated email templates and preserves that independent recovery path.

Validation: `node --test tests/unit/*.cjs`, `npm run typecheck`, and `npm run build`. Email tests exercise the actual template/delivery code with an SMTP stub, including every structured template, generic AIO verification, direct/admin HTML, campaign personalization, logo embedding, attachment preservation and escaping. Visual review covers a 320px email and code-entry fixture plus desktop, input completion, local digits and theme contrast. Rendering in every mail client and real inbox delivery are separate live checks.
