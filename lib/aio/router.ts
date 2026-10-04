import type { AioChatMessage, AioIntent, AioRouteDecision } from '@/lib/aio/types';

const CONTINUE_RE = /^(continue|go on|keep going|carry on|more|tell me more|continue please)[.!\s]*$/i;
const TRACKING_ID_RE = /\b(?:ACL|AX-T)-[A-Z0-9_-]{4,96}\b/i;

function clean(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function classify(value: string): AioIntent {
  const text = value.toLowerCase();

  if (
    TRACKING_ID_RE.test(value) ||
    includesAny(text, ['track my application', 'application status', 'check my application', 'where is my application', 'application tracking', 'review status'])
  ) {
    return 'application_tracking';
  }

  if (includesAny(text, ['company verification', 'verify company', 'verify auronix', 'business verification', 'company record'])) {
    return 'company_verification';
  }

  if (includesAny(text, ['live agent', 'human agent', 'talk to a human', 'speak to a human'])) {
    return 'live_agent';
  }

  if (includesAny(text, ['support ticket', 'contact support', 'support request', 'technical problem', 'account dispute'])) {
    return 'support';
  }

  if (
    /^(open|go to|take me to|show me|navigate to|find)\b/i.test(value) ||
    includesAny(text, ['where do i apply', 'where can i apply', 'where do i check', 'which page'])
  ) {
    return 'navigation';
  }

  if (includesAny(text, ['supplier', 'manufacturer', 'distributor', 'brand partnership', 'supply products', 'onboarding'])) {
    return 'supplier';
  }

  if (includesAny(text, ['privacy', 'terms', 'cookie', 'disclaimer', 'policy'])) {
    return 'policy';
  }

  if (includesAny(text, ['catalog', 'product list', 'sku list', 'catalogue'])) {
    return 'catalog';
  }

  if (includesAny(text, ['login', 'password', 'account', 'profile', 'sign in', 'reset password'])) {
    return 'account';
  }

  if (
    includesAny(text, [
      'amazon', 'walmart', 'ebay', 'fba', 'fbm', 'asin', 'upc', 'sku',
      'buy box', 'map pricing', 'minimum advertised price', 'marketplace fee',
      'wholesale', 'resale', 'invoice'
    ])
  ) {
    return 'marketplace';
  }

  if (
    includesAny(text, [
      'auronix', 'what do you do', 'what does the company do', 'services',
      'our process', 'your process', 'about the company', 'what is this company'
    ])
  ) {
    return 'auronix_information';
  }

  return 'general_question';
}

function previousUserMessage(messages: AioChatMessage[]) {
  for (let index = messages.length - 2; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user' && messages[index].content.trim()) {
      return messages[index].content.trim();
    }
  }
  return '';
}

export function routeAioQuery(
  latestUserMessage: string,
  messages: AioChatMessage[],
  pathname = '/'
): AioRouteDecision {
  const latest = clean(latestUserMessage);
  const continuation = CONTINUE_RE.test(latest);
  const prior = continuation ? previousUserMessage(messages) : '';
  const queryForIntent = prior || latest;
  const intent = classify(queryForIntent);
  const trackingId = latest.match(TRACKING_ID_RE)?.[0]?.toUpperCase();

  const companyIntent = [
    'auronix_information',
    'supplier',
    'application_tracking',
    'support',
    'navigation',
    'account',
    'catalog',
    'policy',
    'company_verification',
  ].includes(intent);

  const pageContext =
    pathname !== '/' && pathname.length < 180
      ? ` Current Auronix page: ${pathname}.`
      : '';

  const retrievalQuery = clean(
    continuation
      ? `${prior}. Continue the current Auronix topic.${pageContext}`
      : `${latest}${pageContext}`
  );

  return {
    intent,
    continuation,
    requiresRetrieval: companyIntent || intent === 'marketplace',
    requiresLiveData: intent === 'application_tracking' && Boolean(trackingId),
    requiresAuthentication: intent === 'application_tracking',
    shouldSuggestLiveAgent: intent === 'live_agent' || intent === 'support',
    trackingId,
    retrievalQuery,
  };
}

export function extractTrackingId(value: string) {
  return value.match(TRACKING_ID_RE)?.[0]?.toUpperCase() || null;
}
