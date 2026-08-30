import { DEFAULT_FAQS, TROUBLESHOOTING_ARTICLES } from '@/lib/help-content';

export type PremadeMemoryEntry = {
  id: string;
  query: string;
  answer: string;
  category: string;
  url?: string;
};

const QUESTION_VARIANTS = [
  (question: string) => question,
  (question: string) => `Help me with ${question}`,
  (question: string) => `Can you explain ${question}`,
  (question: string) => `I need support with ${question}`,
  (question: string) => `${question.replace(/\?$/, '')} help`,
  (question: string) => `Troubleshoot ${question}`,
  (question: string) => `What should I do about ${question}`,
  (question: string) => `Auronix ${question}`,
] as const;

const CATEGORY_LINKS: Record<string, { label: string; url: string }> = {
  'Seller Applications': { label: 'Seller application', url: '/seller/apply' },
  'WhatsApp & Email Verification': { label: 'Seller application verification', url: '/seller/apply' },
  'Approval & Account Creation': { label: 'Seller account help', url: '/help/seller-invitation-link' },
  'Login, Passwords & Security': { label: 'Seller Login', url: '/seller/login' },
  'Seller Dashboard': { label: 'Seller dashboard help', url: '/help/seller-dashboard-access' },
  'Catalogs & Products': { label: 'Catalog troubleshooting', url: '/help/catalog-product-errors' },
  'Support & Notifications': { label: 'Contact Support', url: '/support' },
  'Suppliers & Partnerships': { label: 'Become a Supplier', url: '/supplier' },
  'Privacy, Legal & Cookies': { label: 'Privacy Policy', url: '/privacy' },
  'Technical Troubleshooting': { label: 'Help Center', url: '/help' },
};

function withLink(answer: string, category: string) {
  const link = CATEGORY_LINKS[category];
  return link ? `${answer}\n\n[${link.label}](${link.url})` : answer;
}

// 126 verified FAQs × 8 natural query forms = 1,008 pre-made entries.
// They are generated deterministically at startup and require no database or AI call.
export const AI_PREMADE_MEMORY: PremadeMemoryEntry[] = DEFAULT_FAQS.flatMap((faq) =>
  QUESTION_VARIANTS.map((makeVariant, index) => ({
    id: `${faq.id}-v${index + 1}`,
    query: makeVariant(faq.question),
    answer: withLink(faq.answer, faq.category),
    category: faq.category,
  }))
);

for (const article of TROUBLESHOOTING_ARTICLES) {
  AI_PREMADE_MEMORY.push({
    id: `article-${article.slug}`,
    query: article.title,
    answer: `${article.summary}\n\n[Open the step-by-step guide](/help/${article.slug})`,
    category: article.category,
    url: `/help/${article.slug}`,
  });
}

AI_PREMADE_MEMORY.push(
  { id: 'common-company', query: 'What does Auronix Commerce do?', answer: 'Auronix Commerce LLC supports structured eCommerce sourcing, supplier relationships, procurement, distribution, and marketplace operations.\n\n[About Auronix](/about)', category: 'About Auronix Commerce' },
  { id: 'common-seller-apply', query: 'How can I become a seller?', answer: 'Start the five-step seller application, verify the WhatsApp number and email you control, complete truthful business details, then submit the application for review. Submission does not guarantee approval.\n\n[Start or resume a seller application](/seller/apply)', category: 'Seller Applications' },
  { id: 'common-seller-process', query: 'What is the seller application process?', answer: 'The seller application has five saved steps: WhatsApp verification, email verification, business information, business profile, and final review. Keep the private resume ID so you can continue a saved draft.\n\n[Start or resume a seller application](/seller/apply)', category: 'Seller Applications' },
  { id: 'common-seller-login', query: 'Where can I login as a seller?', answer: 'Use the official Seller Login page with the email and password for an approved, created seller account.\n\n[Seller Login](/seller/login)', category: 'Login, Passwords & Security' },
  { id: 'common-supplier', query: 'How can I become a supplier?', answer: 'Open the supplier application, provide accurate company, contact, product or service, and operational information, then submit it for review. Submission does not guarantee a commercial relationship.\n\n[Become a Supplier](/supplier)', category: 'Suppliers & Partnerships' },
  { id: 'common-contact', query: 'How can I contact Auronix?', answer: 'Use the Contact page for business inquiries or Support for a website, seller, application, or account problem.\n\n[Contact Auronix](/contact)\n\n[Open Support](/support)', category: 'Support & Notifications' },
  { id: 'common-reset', query: 'How do I reset my password?', answer: 'Open Forgot Password, enter the seller account email, and use only the newest secure reset link. The response stays generic to protect account privacy.\n\n[Reset password](/forgot-password)', category: 'Login, Passwords & Security' },
  { id: 'common-resume', query: 'How do I resume my seller application?', answer: 'Open Seller Apply, choose Resume saved application, and enter the private resume ID exactly as issued.\n\n[Resume seller application](/seller/apply)', category: 'Seller Applications' },
  { id: 'common-dashboard', query: 'Why is my seller dashboard not working?', answer: 'Confirm account creation completed, sign out and back in, allow cookies and site storage, and retry in a current browser without blocking extensions. If it continues, follow the technical guide.\n\n[Fix seller dashboard access](/help/seller-dashboard-access)', category: 'Seller Dashboard' },
  { id: 'common-otp', query: 'Why did I not receive my OTP?', answer: 'Confirm you requested the code for the correct phone number or email, check the relevant inbox or WhatsApp instructions, wait briefly, and use only the newest active code.\n\n[Verification troubleshooting](/help/whatsapp-verification)', category: 'WhatsApp & Email Verification' },
  { id: 'common-invite', query: 'Why is my seller invitation link invalid?', answer: 'The link may be incomplete, altered, expired, already used, or replaced. Open the complete newest URL from the original approval email; request a fresh authorized invitation if needed.\n\n[Fix an invitation link](/help/seller-invitation-link)', category: 'Approval & Account Creation' },
  { id: 'common-unsubscribe', query: 'How do I unsubscribe from the newsletter?', answer: 'Use the newsletter unsubscribe page, verify control of the address using the secure link or code, choose a reason if requested, and confirm.\n\n[Unsubscribe](/newsletter/unsubscribe)', category: 'Privacy, Legal & Cookies' },
  { id: 'common-help', query: 'Where can I find technical help?', answer: 'The Auronix Help Center contains step-by-step guides for applications, verification, invitations, password reset, seller dashboard access, catalogs, notifications, maintenance, and browser problems.\n\n[Open Help Center](/help)', category: 'Technical Troubleshooting' },
  { id: 'common-marketplace', query: 'Can you explain your marketplace expertise?', answer: 'Auronix Commerce supports structured marketplace operations such as product and supplier coordination, catalog readiness, sourcing, procurement, and related eCommerce workflows. Third-party platforms control their own accounts, policies, and decisions.\n\n[Marketplace expertise](/marketplace-expertise)', category: 'Marketplace Operations' },
  { id: 'common-shop', query: 'Where can I shop Auronix products?', answer: 'Visit the Auronix Commerce product-discovery shop to browse and compare selected products. Auronix does not sell or ship products directly. Purchase buttons continue to Amazon, which handles checkout, payment, delivery, orders, returns, refunds, and warranties. Auronix Commerce may earn an affiliate commission from qualifying purchases.\n\n[Open the Auronix Product Shop](https://shop.auronixcommerce.com)', category: 'Marketplace Operations' },
);

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'can', 'could', 'do', 'does', 'for', 'from',
  'help', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'please', 'support',
  'tell', 'that', 'the', 'this', 'to', 'what', 'when', 'where', 'which', 'why', 'with',
  'would', 'you', 'your', 'auronix', 'commerce', 'explain', 'need', 'should', 'troubleshoot',
]);

const TOKEN_EQUIVALENTS: Record<string, string> = {
  signin: 'login', signedin: 'login', logging: 'login', logon: 'login',
  application: 'apply', applications: 'apply', applicant: 'apply', applying: 'apply', applied: 'apply',
  become: 'apply', submit: 'apply', submitting: 'apply', start: 'apply',
  verification: 'verify', verified: 'verify', verifying: 'verify',
  invitation: 'invite', invited: 'invite',
  passwords: 'password', resetting: 'reset',
  emails: 'email', mailbox: 'email',
  whatsapp: 'whatsapp', otp: 'code', codes: 'code',
  sellers: 'seller', vendors: 'seller', vendor: 'seller',
  suppliers: 'supplier', partnerships: 'partner', partners: 'partner',
  catalogs: 'catalog', products: 'product', notifications: 'notification',
  cookies: 'cookie', browsers: 'browser',
  invalid: 'invalid', expired: 'expired', expiry: 'expired',
  missing: 'missing', receive: 'missing', received: 'missing', arriving: 'missing',
};

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/sign[ -]?in/g, 'login')
    .replace(/log[ -]?in/g, 'login')
    .replace(/pass[ -]?word/g, 'password')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string) {
  const result = normalizedText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => TOKEN_EQUIVALENTS[token] || token)
    .filter((token) => !STOP_WORDS.has(token) && token.length > 1);
  return Array.from(new Set(result));
}

function similarity(input: string, candidate: string) {
  const normalizedInput = normalizedText(input);
  const normalizedCandidate = normalizedText(candidate);
  if (!normalizedInput || !normalizedCandidate) return { score: 0, overlap: 0 };
  if (normalizedInput === normalizedCandidate) return { score: 1, overlap: 99 };

  const inputTokens = tokens(input);
  const candidateTokens = tokens(candidate);
  if (!inputTokens.length || !candidateTokens.length) return { score: 0, overlap: 0 };
  const candidateSet = new Set(candidateTokens);
  const overlap = inputTokens.filter((token) => candidateSet.has(token)).length;
  if (!overlap) return { score: 0, overlap: 0 };

  const inputCoverage = overlap / inputTokens.length;
  const candidateCoverage = overlap / candidateTokens.length;
  const union = new Set([...inputTokens, ...candidateTokens]).size;
  const jaccard = overlap / union;
  const contained = normalizedInput.length >= 12 && (normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate));
  return { score: contained ? Math.max(0.9, inputCoverage) : inputCoverage * 0.55 + candidateCoverage * 0.25 + jaccard * 0.2, overlap };
}

export function findPremadeAnswer(input: string) {
  if (input.trim().length < 4 || input.trim().length > 700) return null;
  let best: { entry: PremadeMemoryEntry; score: number; overlap: number } | null = null;

  for (const entry of AI_PREMADE_MEMORY) {
    const result = similarity(input, entry.query);
    if (!best || result.score > best.score) best = { entry, ...result };
  }

  if (!best) return null;
  const inputTokenCount = tokens(input).length;
  const confident = best.score >= 0.74 && (best.overlap >= 2 || (inputTokenCount === 1 && best.score === 1));
  if (!confident) return null;

  return {
    answer: best.entry.answer,
    category: best.entry.category,
    memoryId: best.entry.id,
    confidence: Math.round(best.score * 1000) / 1000,
  };
}
