export type AioRole = 'user' | 'assistant';

export type AioIntent =
  | 'auronix_information'
  | 'supplier'
  | 'application_tracking'
  | 'support'
  | 'navigation'
  | 'marketplace'
  | 'general_question'
  | 'account'
  | 'catalog'
  | 'policy'
  | 'company_verification'
  | 'search'
  | 'action'
  | 'live_agent'
  | 'unknown';

export type AioChatMessage = {
  role: AioRole;
  content: string;
};

export type AioSourceType =
  | 'website'
  | 'policy'
  | 'faq'
  | 'admin'
  | 'database';

export type AioSource = {
  id: string;
  title: string;
  sourceType: AioSourceType;
  excerpt: string;
  route?: string;
  url?: string;
  lastUpdated?: string;
};

export type AioAction = {
  id: string;
  label: string;
  href: string;
  kind: 'navigate' | 'support' | 'tracking' | 'verification';
};

export type AioKnowledgeRecord = {
  id: string;
  title: string;
  content: string;
  summary?: string;
  sourceType: AioSourceType;
  url?: string;
  route?: string;
  category?: string;
  lastUpdated?: string;
  visibility: 'public' | 'authenticated' | 'admin';
  priority?: number;
  metadata?: Record<string, unknown>;
};

export type AioRouteDecision = {
  intent: AioIntent;
  continuation: boolean;
  requiresRetrieval: boolean;
  requiresLiveData: boolean;
  requiresAuthentication: boolean;
  shouldSuggestLiveAgent: boolean;
  trackingId?: string;
  retrievalQuery: string;
};

export type AioProviderMessage = {
  role: 'system' | AioRole;
  content: string;
};

export type AioProviderRequest = {
  messages: AioProviderMessage[];
  maxTokens: number;
  temperature?: number;
  model?: string;
  fallbackModel?: string;
};

export type AioProviderInfo = {
  provider: string;
  model: string;
  fallbackModel?: string;
  usedFallback: boolean;
};

export type AioStreamEvent =
  | { type: 'message_start'; requestId: string }
  | { type: 'status'; label: string }
  | { type: 'source'; source: AioSource }
  | { type: 'action'; action: AioAction }
  | { type: 'token'; token: string }
  | {
      type: 'message_complete';
      requestId: string;
      answerSource: 'premade' | 'auronix' | 'general';
      provider?: string;
      model?: string;
      usedFallback?: boolean;
      truncated?: boolean;
    }
  | { type: 'error'; message: string; code?: string };
