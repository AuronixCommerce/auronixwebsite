import { PUBLIC_SITE_KNOWLEDGE, getPageKnowledge } from '@/lib/ai-site-knowledge';
import type { AioIntent, AioKnowledgeRecord, AioSource } from '@/lib/aio/types';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'do', 'does', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'this',
  'to', 'what', 'when', 'where', 'which', 'with', 'you', 'your', 'about',
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function safeText(value: unknown, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeCompany(company: Record<string, unknown>) {
  const allowed = [
    'companyName',
    'legalName',
    'tagline',
    'footerDescription',
    'publicEmail',
    'supportEmail',
    'phone',
    'businessAddress',
    'country',
    'website',
  ] as const;

  return allowed
    .map((key) => {
      const value = safeText(company[key], 1000);
      return value ? `${key}: ${value}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export function getStaticAioKnowledge(): AioKnowledgeRecord[] {
  return PUBLIC_SITE_KNOWLEDGE.map((entry) => ({
    id: `site:${entry.path}`,
    title: entry.title,
    content: [
      entry.summary,
      entry.topics.length ? `Topics: ${entry.topics.join(', ')}` : '',
      entry.actions?.length ? `Actions: ${entry.actions.join(', ')}` : '',
      entry.related?.length ? `Related routes: ${entry.related.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    summary: entry.summary,
    sourceType:
      /privacy|terms|cookie|disclaimer|policy/i.test(entry.path)
        ? 'policy'
        : 'website',
    route: entry.path,
    category: entry.topics[0],
    visibility: 'public',
    priority: entry.path === '/' ? 2 : 1,
    metadata: {
      topics: entry.topics,
      actions: entry.actions || [],
      related: entry.related || [],
    },
  }));
}

export function companyKnowledgeRecord(
  company: Record<string, unknown>
): AioKnowledgeRecord | null {
  const content = safeCompany(company);
  if (!content) return null;

  return {
    id: 'database:company-profile',
    title: 'Auronix Company Information',
    content,
    summary: content,
    sourceType: 'database',
    route: '/company-verification',
    category: 'company',
    visibility: 'public',
    priority: 5,
  };
}

export function faqKnowledgeRecords(value: unknown): AioKnowledgeRecord[] {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .slice(0, 200)
    .flatMap(([id, raw]) => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as Record<string, unknown>;
      const question = safeText(item.question, 700);
      const answer = safeText(item.answer, 3000);
      if (!question || !answer || item.active === false) return [];

      return [{
        id: `faq:${id}`,
        title: question,
        content: answer,
        summary: answer,
        sourceType: 'faq' as const,
        route: '/faq',
        category: safeText(item.category, 120) || 'faq',
        visibility: 'public' as const,
        priority: 3,
        lastUpdated: safeText(item.updatedAt, 100) || undefined,
      }];
    });
}

export function adminKnowledgeRecords(value: unknown): AioKnowledgeRecord[] {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .slice(0, 250)
    .flatMap(([id, raw]) => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as Record<string, unknown>;
      if (item.active === false || item.visibility === 'admin') return [];

      const title = safeText(item.title, 180);
      const content = safeText(item.content, 5000);
      if (!title || !content) return [];

      const route = safeText(item.route, 300);
      const url = safeText(item.url, 500);

      return [{
        id: `admin:${id}`,
        title,
        content,
        summary: safeText(item.summary, 1000) || content.slice(0, 1000),
        sourceType: 'admin' as const,
        route: route.startsWith('/') ? route : undefined,
        url: /^https:\/\//i.test(url) ? url : undefined,
        category: safeText(item.category, 120) || 'admin knowledge',
        lastUpdated: safeText(item.updatedAt, 100) || undefined,
        visibility: item.visibility === 'authenticated' ? 'authenticated' as const : 'public' as const,
        priority: 4,
      }];
    });
}

function scoreRecord(
  query: string,
  record: AioKnowledgeRecord,
  pathname: string,
  intent: AioIntent
) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;

  const title = normalize(record.title);
  const body = normalize(`${record.summary || ''} ${record.content}`);
  const category = normalize(record.category || '');
  const metadata = normalize(JSON.stringify(record.metadata || {}));
  const recordTokens = new Set(tokens(`${title} ${body} ${category} ${metadata}`));

  let score = Number(record.priority || 0);

  for (const token of queryTokens) {
    if (title.includes(token)) score += 4;
    if (category.includes(token)) score += 2.5;
    if (recordTokens.has(token)) score += 1.4;
  }

  const normalizedQuery = normalize(query);
  if (normalizedQuery.length > 10 && body.includes(normalizedQuery)) score += 8;
  if (record.route === pathname) score += 6;

  if (intent === 'company_verification' && record.route === '/company-verification') score += 12;
  if (intent === 'application_tracking' && record.route === '/seller/application/track') score += 12;
  if (intent === 'supplier' && /supplier/i.test(`${record.title} ${record.route || ''}`)) score += 8;
  if (intent === 'support' && /support/i.test(`${record.title} ${record.route || ''}`)) score += 8;
  if (intent === 'policy' && record.sourceType === 'policy') score += 8;

  return score;
}

export function retrieveAioKnowledge(
  query: string,
  records: AioKnowledgeRecord[],
  options: {
    pathname?: string;
    intent: AioIntent;
    limit?: number;
    allowAuthenticated?: boolean;
  }
) {
  const pathname = options.pathname || '/';
  const limit = Math.min(Math.max(options.limit || 4, 1), 6);
  const visible = records.filter((record) =>
    record.visibility === 'public' ||
    (options.allowAuthenticated && record.visibility === 'authenticated')
  );

  const ranked = visible
    .map((record) => ({
      record,
      score: scoreRecord(query, record, pathname, options.intent),
    }))
    .filter((entry) => entry.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!ranked.length) {
    const page = getPageKnowledge(pathname);
    if (page) {
      const record = getStaticAioKnowledge().find((item) => item.route === page.path);
      if (record) ranked.push({ record, score: 1 });
    }
  }

  return ranked;
}

export function knowledgeToSource(record: AioKnowledgeRecord): AioSource {
  return {
    id: record.id,
    title: record.title,
    sourceType: record.sourceType,
    excerpt: (record.summary || record.content).trim().slice(0, 280),
    route: record.route,
    url: record.url,
    lastUpdated: record.lastUpdated,
  };
}
