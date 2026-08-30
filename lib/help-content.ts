export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  active: true;
  createdAt: number;
  updatedAt: number;
};

export const FAQ_CATEGORY_ORDER = [
  'About Auronix Commerce',
  'Seller Applications',
  'WhatsApp & Email Verification',
  'Approval & Account Creation',
  'Login, Passwords & Security',
  'Seller Dashboard',
  'Catalogs & Products',
  'Support & Notifications',
  'Suppliers & Partnerships',
  'Marketplace Operations',
  'Privacy, Legal & Cookies',
  'Technical Troubleshooting',
] as const;

type FaqPair = readonly [question: string, answer: string];

const GROUPS: ReadonlyArray<readonly [string, readonly FaqPair[]]> = [
  ['About Auronix Commerce', [
    ['What is Auronix Commerce LLC?', 'Auronix Commerce LLC supports structured eCommerce sourcing, supplier relationships, procurement, distribution, and marketplace operations.'],
    ['Does Auronix Commerce operate an online retail store?', 'The corporate website explains Auronix services and partnerships. A separate product-discovery shop at shop.auronixcommerce.com links visitors to Amazon; Auronix does not directly sell, charge, ship, or manage customer orders.'],
    ['Who can contact Auronix Commerce?', 'Suppliers, sellers, brands, service partners, applicants, and people with a legitimate business or support inquiry may contact the team.'],
    ['Where can I verify company information?', 'Use the Company Verification page for the website’s published company-identification and verification information.'],
    ['How do I contact Auronix Commerce?', 'Use the Contact or Support page and choose the subject that most closely matches your inquiry.'],
    ['Does submitting a form guarantee a partnership?', 'No. A submission starts a review only and does not guarantee approval, onboarding, purchasing, distribution, or any commercial relationship.'],
    ['Does Auronix promise sales or marketplace results?', 'No. Marketplace performance depends on many factors, and the website does not promise sales, rankings, placement, or commercial outcomes.'],
    ['Where can I read recent website updates?', 'Open the What’s New page for published product, policy, and website updates.'],
    ['Where can I find Auronix policies?', 'Privacy, Terms, Disclaimer, Cookie Policy, and Seller Policy links are available in the website footer.'],
    ['How do I report incorrect website information?', 'Send the page URL and a clear description through Support so the team can review the published information.'],
  ]],
  ['Seller Applications', [
    ['Who can submit a seller application?', 'A person authorized to provide accurate information for the proposed seller or business may submit an application.'],
    ['Where do I start a seller application?', 'Choose Seller Access, select Create account or apply, and open the seller application page.'],
    ['How many steps are in the seller application?', 'The application uses five saved steps: WhatsApp verification, email verification, business details, profile information, and review.'],
    ['Does each application step save automatically?', 'Completed application progress is saved when the flow provides a successful save confirmation. Keep the private resume ID safely.'],
    ['Can I resume an unfinished seller application?', 'Yes. Choose Resume saved application and enter the private resume ID associated with that draft.'],
    ['What is the seller application resume ID?', 'It is a private reference generated for an application draft. It helps retrieve saved progress and should not be posted publicly.'],
    ['Can I submit two applications with the same email?', 'The system blocks sensible duplicates, including an existing seller account and active or pending applications for the same normalized email.'],
    ['Are email addresses case-sensitive in seller applications?', 'No. The server normalizes email addresses so uppercase and lowercase versions are treated as the same address.'],
    ['What information should I prepare before applying?', 'Prepare an accessible WhatsApp number, an email you control, business identity and address details, and a truthful description of your operations.'],
    ['Can I apply with a personal email address?', 'The form lets you identify the email as personal or business. Use an address you can verify and continue to access.'],
    ['Why was my application rejected as a duplicate?', 'A seller account or an active application may already use that normalized email. Use the existing account, resume the saved application, or contact Support.'],
    ['Can I change my email midway through an application?', 'You may change unsubmitted information, but the new email must be verified and must not belong to another seller account or active application.'],
    ['What happens after I submit the application?', 'The application enters review. Approval is not automatic; monitor the verified email and the application status provided by Auronix.'],
    ['Can Support approve my application through chat?', 'No. The AI assistant and support chat cannot approve applications. Approval must come through the authorized review workflow.'],
  ]],
  ['WhatsApp & Email Verification', [
    ['Why must I verify my WhatsApp number?', 'Verification helps confirm that the applicant controls the number used for application communication and security checks.'],
    ['How do I request the WhatsApp verification code?', 'Enter the full number with country code, create the verification request, then follow the on-page instruction to message OTP from that same WhatsApp number.'],
    ['Why did my WhatsApp code not arrive?', 'Confirm the country code, use the same number entered in the form, check connectivity, wait briefly, and request a new active code if the earlier request expired.'],
    ['Why is my WhatsApp OTP invalid?', 'The code may be mistyped, expired, already used, or tied to another request or phone number. Enter the newest code under the WhatsApp field.'],
    ['Can I verify with a different WhatsApp number?', 'Create a new verification request for the new number. A code issued for one number or request cannot verify another.'],
    ['How long does a WhatsApp verification request remain valid?', 'Use the expiry information shown in the flow. Expired requests must be replaced with a new request for security.'],
    ['Why must I verify my email address?', 'Email verification confirms access to the address used for application status, account invitations, password recovery, and important notices.'],
    ['Where is the email verification code sent?', 'It is sent to the personal or business email address selected and entered in the application.'],
    ['What should I do if the email code is missing?', 'Check spam and filtered folders, confirm the displayed address, allow a few minutes, then request a new code without repeatedly submitting the form.'],
    ['Why does the email code show as expired?', 'Verification codes are intentionally time-limited. Request a new code and use only the latest message.'],
    ['Can an old verification code be reused?', 'No. Codes are single-purpose and may be consumed or invalidated when a newer request is created.'],
    ['Is it safe to share my verification code with Support?', 'No. Never send OTPs, passwords, reset codes, or invitation tokens to another person. Auronix staff should not need your secret code.'],
  ]],
  ['Approval & Account Creation', [
    ['How will I know if my seller application is approved?', 'An approval notice is sent through the verified contact route and includes the authorized next step when account creation is available.'],
    ['What is a seller account invitation link?', 'It is a secure, time-limited, one-time link that allows an approved applicant to create the seller account password.'],
    ['Why does my invitation link say invalid?', 'The link may be incomplete, altered, expired, already consumed, or associated with a superseded invitation. Open the complete newest URL from the original email.'],
    ['What does an expired invitation mean?', 'The invitation passed its security expiry and can no longer create an account. Request a fresh invitation through the supported approval workflow.'],
    ['What does an already-used invitation mean?', 'The one-time invitation has already created an account. Use Seller Login or password reset rather than reusing the link.'],
    ['Can I open the invitation link on another device?', 'Yes, if the full unused link is opened before expiry. Complete account creation on a trusted device and avoid forwarding the URL.'],
    ['What password should I create?', 'Use a unique, strong password that meets every requirement shown on the account-creation form and is not reused on another service.'],
    ['Why do the password and confirmation fields fail?', 'They must match exactly and meet the displayed length and complexity requirements. Check keyboard layout and accidental spaces.'],
    ['What happens after account creation succeeds?', 'The invitation is consumed and the account can be accessed from Seller Login using the approved email and new password.'],
    ['Can an unapproved applicant create a seller account?', 'No. Account creation requires a valid invitation issued by the authorized approval workflow.'],
  ]],
  ['Login, Passwords & Security', [
    ['Where is Seller Login?', 'Use Seller Access in the footer or navigation and choose Login, or go directly to the published Seller Login page.'],
    ['Why does Seller Login reject my email?', 'Use the normalized email attached to the approved seller account. An application email does not become a login until account creation succeeds.'],
    ['Why does Seller Login reject my password?', 'Check the email, keyboard layout, password manager entry, and capitalization. If necessary, use the official password-reset flow.'],
    ['How do I reset my seller password?', 'Open Forgot Password, enter the account email, and follow the secure reset link sent by the authentication provider.'],
    ['Why does the reset page say the link is invalid?', 'The link may be expired, already used, incomplete, altered by an email scanner, or replaced by a newer reset request. Request a new link.'],
    ['Can I use an older password-reset email?', 'Use the newest reset email. Older action codes can become invalid when replaced or consumed.'],
    ['Why does password reset not reveal whether an account exists?', 'The request response is intentionally generic to prevent attackers from discovering registered email addresses.'],
    ['Should I stay signed in on a shared device?', 'No. Sign out after use and avoid saving passwords or session data on a shared or public device.'],
    ['What should I do after suspicious account activity?', 'Change the password from a trusted device, sign out active sessions where available, and contact Support with non-secret details.'],
    ['Will Auronix ask for my password?', 'No. Do not disclose your password, verification code, reset link, or account invitation token to anyone.'],
  ]],
  ['Seller Dashboard', [
    ['What can I access from the seller dashboard?', 'Available areas may include account overview, profile, settings, catalogs, products, notifications, and support according to account permissions.'],
    ['Why is my seller dashboard blank?', 'Refresh once, confirm the session is valid, disable aggressive content blockers for the site, and sign in again. If it continues, contact Support.'],
    ['Why am I redirected from the dashboard to login?', 'The authentication session may be missing, expired, revoked, or associated with an account that is not active. Sign in again.'],
    ['Where can I update my seller profile?', 'Use the Profile area in the seller navigation. Save changes and wait for the success confirmation before leaving the page.'],
    ['Why did my profile changes not save?', 'Check required fields, keep the page open until saving finishes, and resolve the inline error. Retry once on a stable connection.'],
    ['Where can I view seller notifications?', 'Open Notifications from the seller navigation to view approval, verification, support, and catalog-related updates.'],
    ['How do I mark a seller notification as read?', 'Open the notification or use the available read control. The dashboard stores the updated read state for the signed-in seller.'],
    ['Where do I ask for seller support?', 'Open Support in the seller dashboard and submit a clear issue with the affected area, approximate time, and safe diagnostic details.'],
    ['Why is a dashboard feature unavailable?', 'The feature may require an active account, a completed setup field, a specific permission, or may be under maintenance. Read the page message.'],
    ['Can another seller see my dashboard records?', 'Protected seller areas verify the signed-in account. Never share credentials, and report any suspected cross-account exposure immediately.'],
    ['Does refreshing the dashboard delete my data?', 'No. Successfully saved workspace records remain available. Unsaved form text may be lost when the page is refreshed.'],
    ['Which browser should I use for the seller dashboard?', 'Use a current version of Chrome, Edge, Firefox, or Safari with JavaScript, cookies, and secure storage enabled for the site.'],
  ]],
  ['Catalogs & Products', [
    ['Where do I manage seller catalogs?', 'Use Catalogs in the seller dashboard when that feature is available for your account.'],
    ['Where do I manage seller products?', 'Use Products in the seller dashboard. Product tools operate within the authenticated seller workspace.'],
    ['Why can I not create a catalog?', 'Confirm the seller account is active, required profile information is complete, and every required catalog field passes validation.'],
    ['Why can I not create a product?', 'Complete all required fields, choose a valid catalog where required, and correct the inline validation message before retrying.'],
    ['Why is my product not visible immediately?', 'A saved item may still be a draft, require review, or depend on another status. Check the status displayed in the dashboard.'],
    ['Can I leave required product information blank?', 'No. Server-side validation rejects incomplete or unsafe records even if a browser-side check is bypassed.'],
    ['How should I describe a product?', 'Use accurate, specific, non-misleading information. Do not add unsupported claims, fake ratings, invented certifications, or confidential data.'],
    ['What image links should I use?', 'Use accessible HTTPS image URLs you are authorized to use. Confirm the image loads and accurately represents the item.'],
    ['Why does a catalog update show a conflict?', 'Another save or newer saved version may have changed the record. Reload the latest version, review it, and apply the update again.'],
    ['Can Support edit my catalog through AI chat?', 'No. The public AI cannot perform protected seller mutations. Use authenticated dashboard controls or contact authorized Support.'],
  ]],
  ['Support & Notifications', [
    ['How do I create a support request?', 'Use the public Support page or the authenticated seller Support area, select the closest subject, and describe the issue clearly.'],
    ['What information helps troubleshoot a problem?', 'Include the page, action, approximate time, device and browser, visible error, and a safe screenshot with secrets removed.'],
    ['What should I never include in a support ticket?', 'Never include passwords, OTPs, full invitation or reset tokens, payment secrets, private keys, or unrelated personal information.'],
    ['Where do seller support replies appear?', 'Replies may be sent through the configured email route and may also create a notification in the seller dashboard.'],
    ['Why did I not receive a support email?', 'Check spam, confirm your account email, and review seller notifications. Add the official sender to allowed contacts if appropriate.'],
    ['Can I reply to an automated notification?', 'Follow the reply-to information in the message. Some automated addresses may not accept inbound mail.'],
    ['How do I report a security concern?', 'Use Support promptly with non-secret evidence and identify the affected account or page without sharing credentials.'],
    ['Can the AI assistant see my seller account?', 'The public assistant should not expose private seller data or perform protected account actions. Use authenticated pages for account-specific work.'],
  ]],
  ['Suppliers & Partnerships', [
    ['Where can I apply as a supplier?', 'Open Become a Supplier from the website navigation or footer and complete the published supplier form.'],
    ['Is a supplier submission the same as a seller account?', 'No. Supplier submissions and seller applications serve different workflows and do not automatically create the other account type.'],
    ['What should a supplier submission include?', 'Provide accurate contact, company, product or service, capacity, and relevant operational information requested by the form.'],
    ['Does submitting as a supplier guarantee purchasing?', 'No. A submission is reviewed and does not guarantee a purchase order, listing, contract, volume, or continuing relationship.'],
    ['Can I submit confidential information in the first form?', 'Provide only information reasonably required by the form. Do not send trade secrets, credentials, or unnecessary sensitive records.'],
    ['How do I become a business partner?', 'Review the Partners and Partner Portal pages, then use the appropriate contact or authenticated access route.'],
    ['Is the Partner Portal public?', 'General information may be public, but protected partner functions require an authorized signed-in account.'],
    ['Can a seller use the Partner Portal?', 'An eligible authenticated seller may access connected partner functions according to the permissions and workflow shown by the site.'],
    ['How long does supplier review take?', 'Review time depends on the submission and current workload. Do not rely on an unstated deadline; monitor the contact address you provided.'],
    ['How do I update a submitted supplier inquiry?', 'Contact Support with the original reference and the corrected non-secret information. Avoid creating repeated duplicate submissions.'],
  ]],
  ['Marketplace Operations', [
    ['Where is the official Auronix product shop?', 'Visit shop.auronixcommerce.com to discover and compare products selected by Auronix Commerce. Purchase buttons continue to Amazon using affiliate links.'],
    ['Does Auronix sell or ship products from its affiliate shop?', 'No. Auronix provides product discovery and affiliate links. Amazon handles checkout, payment, delivery, returns, refunds, warranties, and customer orders.'],
    ['Does Auronix earn commission from the product shop?', 'Auronix Commerce may earn an affiliate commission from qualifying Amazon purchases, without directly handling the customer transaction.'],
    ['Where do product purchase buttons lead?', 'Purchase buttons on the Auronix product-discovery shop lead to the corresponding Amazon product link. Visitors should review the destination and Amazon terms before purchasing.'],
    ['What are marketplace operations?', 'They are structured activities supporting product data, sourcing, supplier coordination, catalog readiness, and related eCommerce workflows.'],
    ['Does Auronix own every marketplace it works with?', 'No. Auronix does not claim ownership of third-party marketplaces, platforms, brands, or their services.'],
    ['Does Auronix guarantee marketplace approval?', 'No. Third-party platforms control their own accounts, eligibility, policies, listings, and enforcement decisions.'],
    ['Who controls third-party marketplace policies?', 'The applicable marketplace or service provider controls its own current rules. Verify important requirements directly with that provider.'],
    ['Can marketplace requirements change?', 'Yes. Platform rules, fees, listing requirements, availability, and technical behavior can change independently of Auronix.'],
    ['Does website information replace marketplace documentation?', 'No. Use official third-party documentation for current platform-specific rules and technical requirements.'],
    ['Can Auronix provide legal or tax advice for marketplace selling?', 'No. Consult an appropriately qualified professional for legal, tax, financial, or regulatory advice.'],
    ['Where should I report a marketplace integration issue?', 'Use seller Support and identify the dashboard area and safe error details. For third-party outages, also check the provider’s official status information.'],
  ]],
  ['Privacy, Legal & Cookies', [
    ['Where is the Privacy Policy?', 'The Privacy Policy is linked in the Legal section of the footer.'],
    ['Where are the Terms of Service?', 'The Terms page is linked in the Legal section of the footer.'],
    ['Where is the Cookie Policy?', 'Open Cookie Policy from the footer or from the cookie-preference dialog.'],
    ['How do I change cookie preferences?', 'Choose Cookie Settings in the footer and save your essential, preference, analytics, and marketing choices.'],
    ['Are essential cookies optional?', 'Essential storage is required for core security, sessions, preferences required to operate the site, and other necessary functions.'],
    ['When does analytics load?', 'Configured analytics loads only after analytics consent. If no analytics measurement ID is configured, the script is not loaded.'],
    ['How do I unsubscribe from newsletters?', 'Use the newsletter unsubscribe page, verify control of the email through the secure link or code flow, and confirm your preference.'],
    ['Does newsletter unsubscribe stop security emails?', 'No. Newsletter preferences do not normally suppress necessary transactional, account, or security messages.'],
    ['What happens after a bounce or complaint?', 'Supported delivery webhooks can suppress the newsletter address to protect deliverability and respect provider feedback.'],
    ['Where can I ask a privacy question?', 'Use the contact details published in the Privacy Policy or submit an appropriately categorized Support request.'],
  ]],
  ['Technical Troubleshooting', [
    ['What is the first step when a page does not work?', 'Copy unsaved text, refresh once, confirm connectivity, and retry in a current browser. Then read the closest inline error rather than repeatedly submitting.'],
    ['Why does a page still show maintenance?', 'Refresh once after service is restored. If the maintenance notice remains, contact Support with the affected page address and the time you saw it.'],
    ['Why does a button remain disabled?', 'A required field may be incomplete, a request may already be running, or the current step may require successful verification first.'],
    ['Why does a loading state never finish?', 'The network request may be blocked or delayed. Check connectivity, allow site scripts, refresh once, and capture the visible error if it repeats.'],
    ['Why am I seeing a generic error instead of technical details?', 'Public errors intentionally avoid exposing secrets and internal infrastructure. Support logs can retain a safe diagnostic reference.'],
    ['Can an ad blocker break account pages?', 'Strict blockers can prevent required scripts, cookies, or API calls. Allow the Auronix domain temporarily and retry on the official HTTPS site.'],
    ['What should I do if the page works in private browsing?', 'Clear stale site data for the Auronix domain or review extensions that modify scripts, cookies, storage, or requests.'],
    ['Why does a copied link fail?', 'Email and chat software can truncate, wrap, rewrite, or scan secure URLs. Open the complete latest link directly from the original message.'],
    ['How do I capture a safe screenshot?', 'Show the page and error, but hide email codes, tokens, passwords, personal identifiers, private messages, and browser autofill suggestions.'],
    ['What browser data can I clear safely?', 'Clear cookies and site storage only after saving drafts and knowing your credentials, because doing so signs you out and may remove unsaved local state.'],
    ['How do I identify my browser version?', 'Open the browser’s About or Help screen. Update to a supported current release before reproducing the issue.'],
    ['When should I contact Support?', 'Contact Support after one careful retry when an account, verification, invitation, reset, saved record, or repeated server error remains unresolved.'],
  ]],
];

export const DEFAULT_FAQS: HelpFaq[] = GROUPS.flatMap(([category, items], categoryIndex) =>
  items.map(([question, answer], itemIndex) => ({
    id: `built-in-${categoryIndex + 1}-${itemIndex + 1}`,
    question,
    answer,
    category,
    order: (categoryIndex + 1) * 100 + itemIndex,
    active: true,
    createdAt: 0,
    updatedAt: 0,
  }))
);

export type TroubleshootingSection = {
  heading: string;
  body: string;
  steps?: string[];
};

export type TroubleshootingArticle = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  audience: string;
  sections: TroubleshootingSection[];
};

export const TROUBLESHOOTING_ARTICLES: TroubleshootingArticle[] = [
  { slug: 'seller-dashboard-access', title: 'Troubleshoot seller dashboard access', summary: 'Resolve redirects, expired sessions, blank dashboard states, and account-status problems.', category: 'Seller Dashboard', audience: 'Approved sellers', sections: [
    { heading: 'Before you begin', body: 'Use the official Seller Login page and the email attached to the approved account. An application alone is not a login account.' },
    { heading: 'Restore access', body: 'Work through these checks in order.', steps: ['Confirm account creation completed successfully.', 'Sign out, close duplicate Auronix tabs, and sign in again.', 'Allow cookies and site storage for the official HTTPS domain.', 'Update the browser and retry without extensions that block scripts.', 'If redirected again, use password reset or contact Support with the approximate time.'] },
    { heading: 'What to send Support', body: 'Provide the page URL, time, browser, and visible message. Never send your password, OTP, invitation token, or reset link.' },
  ]},
  { slug: 'seller-application-resume', title: 'Resume a saved seller application', summary: 'Use the private resume ID safely and recover a draft that does not open.', category: 'Seller Applications', audience: 'Seller applicants', sections: [
    { heading: 'Use the resume dialog', body: 'Open Seller Apply, choose Resume saved application, and enter the private resume ID exactly as issued.' },
    { heading: 'If the draft is not found', body: 'Avoid creating repeated applications until you complete these checks.', steps: ['Remove leading or trailing spaces from the resume ID.', 'Confirm you are on the official site and not an old cached tab.', 'Use the most recently issued resume ID.', 'Check whether the saved draft expired under the retention policy.', 'Contact Support with the reference only; never include verification codes.'] },
  ]},
  { slug: 'whatsapp-verification', title: 'Fix WhatsApp verification problems', summary: 'Resolve missing, expired, mismatched, and invalid WhatsApp OTP requests.', category: 'Verification', audience: 'Seller applicants', sections: [
    { heading: 'Match the number and request', body: 'The OTP request is tied to the normalized phone number and the active application verification request.' },
    { heading: 'Verification checklist', body: 'Complete each step before requesting another code.', steps: ['Enter the full country code and phone number.', 'Create the verification request on the website.', 'From that same WhatsApp number, send the instructed OTP message.', 'Enter only the newest six-digit code in the WhatsApp code field.', 'If expired, create one new request and discard older codes.'] },
  ]},
  { slug: 'email-verification', title: 'Fix seller email verification', summary: 'Resolve missing codes, duplicate-account warnings, and expired email verification.', category: 'Verification', audience: 'Seller applicants', sections: [
    { heading: 'Confirm the selected address', body: 'Check whether you selected personal or business email and verify the exact address displayed by the form.' },
    { heading: 'Code troubleshooting', body: 'Email verification codes are time-limited and only the newest active code should be used.', steps: ['Check inbox, spam, quarantine, and filtered tabs.', 'Wait briefly before requesting one replacement code.', 'Enter the code under the email field, not another OTP field.', 'If an account exists, use Seller Login or password reset.', 'If a pending application exists, resume it rather than submitting a duplicate.'] },
  ]},
  { slug: 'seller-invitation-link', title: 'Fix an approved seller invitation link', summary: 'Understand invalid, expired, used, or incomplete seller account-creation links.', category: 'Account Creation', audience: 'Approved sellers', sections: [
    { heading: 'Use the complete newest link', body: 'Open the link directly from the latest approval email. Do not manually edit, shorten, or forward it.' },
    { heading: 'Link states', body: 'Invalid means the token cannot be matched; expired means its security window ended; used means account creation already completed.' },
    { heading: 'Next action', body: 'For an expired or invalid unused invitation, request a new authorized invitation. For a used invitation, proceed to Seller Login or password reset.' },
  ]},
  { slug: 'password-reset-link', title: 'Fix a seller password-reset link', summary: 'Recover from invalid, expired, scanned, or already-used reset links.', category: 'Login & Security', audience: 'Seller accounts', sections: [
    { heading: 'Request one fresh reset', body: 'Open Forgot Password and submit the seller account email once. The response is generic for account privacy.' },
    { heading: 'Open it safely', body: 'Use the newest email on the same trusted device when possible.', steps: ['Copy the entire URL if the email client did not make it clickable.', 'Do not reuse an older email after requesting another reset.', 'Avoid security scanners that pre-open one-time links when possible.', 'Complete the new password and confirmation before the action code expires.'] },
  ]},
  { slug: 'seller-profile-saving', title: 'Fix seller profile saving', summary: 'Resolve disabled Save buttons, validation errors, and changes that do not persist.', category: 'Seller Dashboard', audience: 'Signed-in sellers', sections: [
    { heading: 'Resolve the nearest error', body: 'The page places validation feedback close to the affected field. Correct that field before retrying.' },
    { heading: 'Safe retry procedure', body: 'Keep a copy of longer unsaved text before troubleshooting.', steps: ['Complete required fields in the expected format.', 'Wait for any existing save to finish.', 'Confirm the session is still active.', 'Save once and wait for the success state.', 'Reload only after a successful save to verify persistence.'] },
  ]},
  { slug: 'catalog-product-errors', title: 'Troubleshoot catalogs and products', summary: 'Fix missing fields, invalid relationships, draft states, and catalog-product save errors.', category: 'Catalogs & Products', audience: 'Signed-in sellers', sections: [
    { heading: 'Check ownership and status', body: 'Catalog and product requests are scoped to the authenticated seller. Confirm the selected record belongs to the current workspace.' },
    { heading: 'Validate the record', body: 'The final submission checks determine whether the record can be saved.', steps: ['Complete every required field.', 'Select a valid catalog when the product requires one.', 'Use accurate text and authorized HTTPS image locations.', 'Review draft or published status.', 'Reload the newest saved version before resolving a save conflict.'] },
  ]},
  { slug: 'seller-notifications', title: 'Troubleshoot seller notifications', summary: 'Resolve missing notifications, unread states, and support-reply delivery questions.', category: 'Support & Notifications', audience: 'Signed-in sellers', sections: [
    { heading: 'Refresh notification state', body: 'Open Notifications from the authenticated seller navigation and allow the request to complete.' },
    { heading: 'If an expected item is missing', body: 'Confirm the triggering action actually completed, check the verified email, and review the relevant dashboard record before contacting Support.' },
  ]},
  { slug: 'support-ticket-problems', title: 'Troubleshoot seller support requests', summary: 'Create actionable tickets and resolve submissions or replies that appear missing.', category: 'Support & Notifications', audience: 'Sellers and applicants', sections: [
    { heading: 'Submit an actionable report', body: 'Use a specific subject and describe one problem per request.' },
    { heading: 'Include safe diagnostics', body: 'Include the page, action, approximate time, browser, and visible error. Redact email codes, tokens, passwords, and sensitive personal information.' },
  ]},
  { slug: 'maintenance-page', title: 'Understand maintenance pages', summary: 'Distinguish global, page-specific, scheduled, and AI maintenance states.', category: 'Website', audience: 'All users', sections: [
    { heading: 'Why maintenance appears', body: 'Operations can enable global, page-specific, scheduled, or AI-only maintenance independently.' },
    { heading: 'After service is restored', body: 'Refresh the affected page once. If the notice remains, contact Support with the page address and approximate time.' },
  ]},
  { slug: 'browser-site-data', title: 'Resolve browser and site-data problems', summary: 'Safely diagnose stale cookies, extensions, cached pages, and unsupported browsers.', category: 'Technical', audience: 'All users', sections: [
    { heading: 'Low-risk checks', body: 'Start with a normal refresh and a current browser before clearing data.', steps: ['Save any draft text.', 'Update the browser.', 'Retry in a private window.', 'Disable only extensions that modify site requests.', 'If private mode works, clear Auronix site data and sign in again.'] },
    { heading: 'Remember', body: 'Clearing cookies or local storage signs you out and can remove unsaved local state.' },
  ]},
];

export function getTroubleshootingArticle(slug: string) {
  return TROUBLESHOOTING_ARTICLES.find((article) => article.slug === slug);
}
