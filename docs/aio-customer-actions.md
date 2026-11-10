# Verified customer actions in AIO chat

The popup assistant and `/aio/chat` share a customer action panel. Open **Actions** or ask naturally: “apply as a supplier”, “apply for a seller account”, “subscribe to updates”, “unsubscribe”, “change my email preferences”, “email me this”, “show my tickets”, or “update my profile”.

## What customers can do

| Area             | Supported actions                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Applications     | Supplier application with optional catalog/authorization uploads; seller application with all required address, business and policy steps; email-verified application tracking       |
| Newsletter       | OTP subscription with explicit opt-in; unsubscribe; topic/frequency preferences                                                                                                      |
| Email/support    | Reviewed email to an email-verified mailbox (including guests); support request to the configured support team with a customer receipt; replies, closing and reopening owned tickets |
| Account          | Read own profile, linked application, tickets and notifications; update contact profile fields                                                                                       |
| Seller workspace | Read own products and catalogs; create product drafts and catalog links                                                                                                              |

Activation of seller accounts still uses the approved invitation flow. This feature does not approve applications, issue refunds, change roles, delete other people's data, publish admin content, send bulk messages, or expose database/admin credentials to visitors or models.

## Verification and confirmation

Mutating workflows collect validated details, send an email OTP, display a six-box code input in chat, then display an immutable server-generated review. A **Confirm action** click is required to commit. Form fields, attached files and policy agreements stay in the action panel rather than being sent to the language model. OTPs are HMAC hashed, expire after ten minutes, have five guesses and three sends per workflow, and are bound to the workflow and email. A recipient limit and IP rate limit further limit abuse. Paste formatting and local numerals are normalized. Resending invalidates the previous code and cancels a pending old email when possible.

Signed-in workflows bind to a freshly checked, revocation-checked Firebase user and current database role. Account changes use the current Firebase Auth email. Standalone email copies can also be requested by guests, but only after OTP verification of the exact recipient; the confirmed recipient cannot be changed by model arguments. An email change or sign-in account switch invalidates account actions. Reads return only whitelisted customer fields; admin notes, screening internals, secrets and invitation tokens are excluded. Ticket ownership, seller eligibility, profile versions and admin switches are checked again on execution.

Workflow secrets remain in component memory, not browser chat history. Stored workflow records contain only a hash of the browser capability token. Sessions expire after 30 minutes and are cleaned by the existing email queue worker and security maintenance job. They must not be publicly readable or writable in Firebase rules. Protect `aioCustomerWorkflows` and `aioActionEmailRates` alongside the previously documented private queue and account collections.

Execution leases and stable operation/message IDs prevent repeated confirmation from sending the same message or creating the same draft twice. Original application validation is shared between the dedicated routes and chat. Existing SMTP queue/alerts handle delivery failures; “sent” means provider acceptance, not confirmed inbox delivery. A completed record change is reported separately from a receipt email failure.

## Administration and deployment

Admin → AI contains switches for all customer actions, email/support, applications, and newsletter flows. Switches are enforced by the backend, including when an action was already verified. Existing Firebase Admin and SMTP settings are required. The model is not required for the structured workflows themselves.

If Turnstile enforcement is enabled, configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` together with the existing `TURNSTILE_SECRET_KEY` and `TURNSTILE_ENFORCE=true`. The chat panel renders and refreshes its own challenge. Shared submission handlers inherit only a server-verified request context; caller-supplied headers cannot bypass bot protection. OTP verification is separate from Turnstile.

Queued OTP emails retry while the customer keeps the verification panel open, through an owner-scoped delivery-status request that respects the existing mail backoff and expiry. This works on Vercel as well as Netlify. Unattended queue processing still needs an authenticated scheduler and `CRON_SECRET` on the host. Guest workflows store a stable empty owner ID and normalize missing owner fields in older Firebase records; Firebase removes null fields from reads. PDF or spreadsheet uploads also require the existing private R2 configuration. Without R2, supplier submissions without attachments still work. These integrations must be tested on the deployed host with real credentials; local tests use isolated services and never send real customer email.

Run `node --test tests/unit/*.cjs`, `npm run typecheck`, and `npm run build` before deployment.
