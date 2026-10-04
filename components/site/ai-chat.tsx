'use client';
import { userFacingError } from '@/lib/user-facing-error';
import { Spinner } from '@/components/design/primitives';

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ArrowRight,
  Bot,
  ChevronDown,
  Copy,
  ExternalLink,
  MessageCircle,
  Plus,
  RefreshCw,
  Ticket,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { AuronixMark } from '@/components/site/auronix-mark';
import type { AioSelectionRequest } from '@/lib/aio-selection';
import { auth } from '@/lib/firebase';
import type { AioAction, AioSource, AioStreamEvent } from '@/lib/aio/types';
import { TICKET_CATEGORIES } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Role = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  answerSource?: 'premade' | 'auronix' | 'general';
  sources?: AioSource[];
  actions?: AioAction[];
  requestId?: string;
  interrupted?: boolean;
  sessionBoundary?: boolean;
  endedAt?: number;
};

type TicketStep =
  | 'idle'
  | 'name'
  | 'email'
  | 'category'
  | 'subject'
  | 'message'
  | 'confirm'
  | 'creating';
type TicketDraft = { name: string; email: string; category: string; subject: string; message: string };

const EMPTY_TICKET: TicketDraft = { name: '', email: '', category: '', subject: '', message: '' };
const TICKET_INTENT = /\b(create|open|submit|raise|make)\b.{0,24}\b(ticket|support request)\b/i;

const CHAT_STORAGE_KEY = 'auronix-ai-local-memory-v1';
const MAX_LOCAL_MESSAGES = 60;

const QUICK_QUESTIONS = [
  'What does Auronix Commerce do?',
  'How can I become a supplier?',
  'How can I become a seller?',
  'What is the seller application process?',
  'How can I contact Auronix?',
  'Can you explain your marketplace expertise?',
  'Where can I explore Auronix product selections?',
  'How does the Auronix Amazon affiliate shop work?',
  'Where can I find seller troubleshooting guides?',
  'How do I resume a saved seller application?',
  'What partnership opportunities are available?',
  'Where can I read Auronix policies?',
  'Is there any scheduled maintenance?',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeMarkdownLinks(text: string) {
  return text
    .replace(/\\([()])/g, '$1')
    .replace(/\]\s+\(/g, '](')
    .replace(/\]\(\s+/g, '](')
    .replace(/\s+\)/g, ')');
}

function sanitizePartialMarkdown(text: string) {
  let value = normalizeMarkdownLinks(text);

  const boldMarkers = value.match(/\*\*/g) || [];

  if (boldMarkers.length % 2 !== 0) {
    value = value.replace(/\*\*([^*]*)$/, '$1');
  }

  const italicMarkers =
    value.match(/(?<!\*)\*(?!\*)/g) || [];

  if (italicMarkers.length % 2 !== 0) {
    value = value.replace(
      /(?<!\*)\*([^*]*)$/,
      '$1'
    );
  }

  const markdownLink = value.match(
    /\[([^\]]*)\]\(([^)]*)$/
  );

  if (markdownLink) {
    value = value.replace(
      /\[([^\]]*)\]\(([^)]*)$/,
      '$1'
    );
  }

  return value;
}

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];

  const regex =
    /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\((?:\/(?!\/)[^)\s]*|https?:\/\/[^)\s]+)\)|https?:\/\/[^\s<]+|`[^`]+`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while (
    (match = regex.exec(text)) !== null
  ) {
    if (match.index > lastIndex) {
      nodes.push(
        text.slice(lastIndex, match.index)
      );
    }

    const token = match[0];

    if (
      token.startsWith('**') &&
      token.endsWith('**')
    ) {
      nodes.push(
        <strong
          key={`bold-${key++}`}
          className="font-bold text-foreground"
        >
          {renderInline(token.slice(2, -2))}
        </strong>
      );
    } else if (
      token.startsWith('*') &&
      token.endsWith('*') &&
      !token.startsWith('**')
    ) {
      nodes.push(
        <em
          key={`italic-${key++}`}
          className="italic"
        >
          {renderInline(token.slice(1, -1))}
        </em>
      );
    } else if (
      token.startsWith('~~') &&
      token.endsWith('~~')
    ) {
      nodes.push(
        <del
          key={`strike-${key++}`}
          className="opacity-60"
        >
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('[')) {
      const link = token.match(
        /^\[([^\]]+)\]\((\/(?!\/)[^)\s]*|https?:\/\/[^)\s]+)\)$/
      );

      if (link) {
        const external = /^https?:\/\//.test(link[2]);
        nodes.push(
          <a
            key={`link-${key++}`}
            href={link[2]}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="my-1 inline-flex max-w-full items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 font-semibold text-accent no-underline transition hover:-translate-y-0.5 hover:border-accent/45 hover:bg-accent/15"
          >
            <span className="break-all">
              {link[1]}
            </span>

            {external ? <ExternalLink className="h-3 w-3 shrink-0" /> : <ArrowRight className="h-3 w-3 shrink-0" />}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (
      token.startsWith('https://') ||
      token.startsWith('http://')
    ) {
      const cleanUrl = token.replace(
        /[),.;!?]+$/,
        ''
      );

      nodes.push(
        <a
          key={`url-${key++}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 break-all font-semibold text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
        >
          <span className="break-all">
            {cleanUrl}
          </span>

          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      );
    } else if (
      token.startsWith('`') &&
      token.endsWith('`')
    ) {
      nodes.push(
        <code
          key={`code-${key++}`}
          className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderMarkdown(
  raw: string,
  typing = false
) {
  const text = typing
    ? sanitizePartialMarkdown(raw)
    : normalizeMarkdownLinks(raw);

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n');

  const output: React.ReactNode[] = [];

  let listMode: 'bullet' | 'number' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listMode || listItems.length === 0) {
      return;
    }

    if (listMode === 'bullet') {
      output.push(
        <ul
          key={`ul-${output.length}`}
          className="my-2 list-disc space-y-1.5 pl-5"
        >
          {listItems.map((item, index) => (
            <li
              key={`bullet-${index}`}
              className="break-words pl-1"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      output.push(
        <ol
          key={`ol-${output.length}`}
          className="my-2 list-decimal space-y-1.5 pl-5"
        >
          {listItems.map((item, index) => (
            <li
              key={`number-${index}`}
              className="break-words pl-1"
            >
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    }

    listMode = null;
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (/^[-•]\s+/.test(trimmed)) {
      if (listMode !== 'bullet') {
        flushList();
        listMode = 'bullet';
      }

      listItems.push(
        trimmed.replace(/^[-•]\s+/, '')
      );

      return;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (listMode !== 'number') {
        flushList();
        listMode = 'number';
      }

      listItems.push(
        trimmed.replace(/^\d+[.)]\s+/, '')
      );

      return;
    }

    flushList();

    if (trimmed === '') {
      output.push(
        <div
          key={`space-${index}`}
          className="h-2"
        />
      );

      return;
    }

    if (/^###\s+/.test(trimmed)) {
      output.push(
        <h4
          key={`h4-${index}`}
          className="mb-2 mt-3 font-sans text-sm font-bold tracking-[-0.02em]"
        >
          {renderInline(
            trimmed.replace(/^###\s+/, '')
          )}
        </h4>
      );

      return;
    }

    if (/^##\s+/.test(trimmed)) {
      output.push(
        <h3
          key={`h3-${index}`}
          className="mb-2 mt-3 font-sans text-base font-bold tracking-[-0.025em]"
        >
          {renderInline(
            trimmed.replace(/^##\s+/, '')
          )}
        </h3>
      );

      return;
    }

    if (/^#\s+/.test(trimmed)) {
      output.push(
        <h3
          key={`h2-${index}`}
          className="mb-2 mt-3 font-sans text-lg font-extrabold tracking-[-0.035em]"
        >
          {renderInline(
            trimmed.replace(/^#\s+/, '')
          )}
        </h3>
      );

      return;
    }

    if (trimmed.startsWith('> ')) {
      output.push(
        <blockquote
          key={`quote-${index}`}
          className="my-2 border-l-2 border-accent/60 pl-3 text-foreground-muted italic"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );

      return;
    }

    output.push(
      <div
        key={`line-${index}`}
        className="break-words leading-6"
      >
        {renderInline(line)}
      </div>
    );
  });

  flushList();

  return output;
}

export function AIChat({
  initiallyOpen = false,
  selectionRequest = null,
}: {
  initiallyOpen?: boolean;
  selectionRequest?: AioSelectionRequest | null;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const resize = () => {
      root.style.setProperty('--ac-chat-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty('--ac-chat-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    document.addEventListener('keydown', escape);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      document.removeEventListener('keydown', escape);
      root.style.removeProperty('--ac-chat-viewport-height');
      root.style.removeProperty('--ac-chat-viewport-top');
    };
  }, [open]);


  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [input, setInput] = useState('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [loading, setLoading] = useState(false);

  const [activityLabel, setActivityLabel] =
    useState('AIO is analyzing…');

  const [activeAnswerSource, setActiveAnswerSource] =
    useState<'premade' | 'auronix' | 'general'>('general');

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [clearingMemory, setClearingMemory] = useState(false);

  const [localMemoryReady, setLocalMemoryReady] = useState(false);

  const [visibleAnswer, setVisibleAnswer] =
    useState('');

  const [error, setError] = useState('');

  const [ticketStep, setTicketStep] = useState<TicketStep>('idle');
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>(EMPTY_TICKET);

  const [quickIndex, setQuickIndex] =
    useState(-1);

  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const currentAnswerRef = useRef('');
  const currentSourcesRef = useRef<AioSource[]>([]);
  const currentActionsRef = useRef<AioAction[]>([]);
  const currentRequestIdRef = useRef('');
  const conversationIdRef = useRef(makeId());

  const pathname = usePathname() || '/';

  useEffect(() => {
    if (!selectionRequest?.prompt) {
      return;
    }

    setOpen(true);
    setError('');
    setTicketStep('idle');
    setTicketDraft(EMPTY_TICKET);
    setInput(selectionRequest.prompt);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        selectionRequest.prompt.length,
        selectionRequest.prompt.length
      );
    });
  }, [selectionRequest]);

  const quickQuestion = useMemo(
    () =>
      quickIndex >= 0
        ? QUICK_QUESTIONS[quickIndex]
        : '',
    [quickIndex]
  );

  useEffect(() => {
    const chooseNext = (previous: number) => {
      if (QUICK_QUESTIONS.length <= 1) return 0;
      let next = Math.floor(Math.random() * QUICK_QUESTIONS.length);
      if (next === previous) next = (next + 1) % QUICK_QUESTIONS.length;
      return next;
    };

    setQuickIndex((previous) => chooseNext(previous));

    const timer = window.setInterval(() => {
      setQuickIndex((previous) => chooseNext(previous));
    }, 30000);

    return () =>
      window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        const restored = parsed
          .filter((message: any) =>
            message &&
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.content === 'string'
          )
          .slice(-MAX_LOCAL_MESSAGES) as ChatMessage[];
        if (restored.some((message) => message.content.trim())) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
          const isReload = navigation?.type === 'reload';
          const lastBoundaryIndex = restored.reduce(
            (lastIndex, message, index) => message.sessionBoundary ? index : lastIndex,
            -1
          );
          const hasConversationSinceBoundary = restored
            .slice(lastBoundaryIndex + 1)
            .some((message) => !message.sessionBoundary && message.content.trim());

          setMessages(
            isReload && hasConversationSinceBoundary
              ? [
                  ...restored,
                  {
                    id: makeId(),
                    role: 'assistant',
                    content: '',
                    sessionBoundary: true,
                    endedAt: Date.now(),
                  },
                ]
              : restored
          );
        }
      }
    } catch {
      // Local memory is optional; the chat remains fully usable if storage is unavailable.
    } finally {
      setLocalMemoryReady(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!localMemoryReady) return;
    try {
      window.localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES))
      );
    } catch {
      // Ignore browser quota or privacy-mode storage failures.
    }
  }, [messages, localMemoryReady]);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: loading ? 'auto' : 'smooth',
    });
  }, [
    messages,
    visibleAnswer,
    loading,
    open,
  ]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stopAnswer = () => {
    abortRef.current?.abort();

    const partial = currentAnswerRef.current || visibleAnswer;

    if (partial.trim()) {
      setMessages((existing) => [
        ...existing,
        {
          id: currentRequestIdRef.current || makeId(),
          role: 'assistant',
          content: partial,
          answerSource: activeAnswerSource,
          sources: currentSourcesRef.current,
          actions: currentActionsRef.current,
          requestId: currentRequestIdRef.current || undefined,
          interrupted: true,
        },
      ]);
    }

    currentAnswerRef.current = '';
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = '';

    setVisibleAnswer('');
    setActivityLabel('AIO is analyzing…');
    setLoading(false);
  };

  const clearChatMemory = async () => {
    if (clearingMemory) return;
    setClearingMemory(true);
    abortRef.current?.abort();

    await new Promise((resolve) => window.setTimeout(resolve, 250));

    currentAnswerRef.current = '';
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = '';
    conversationIdRef.current = makeId();
    setMessages([]);
    setVisibleAnswer('');
    setInput('');
    setError('');
    setActivityLabel('AIO is analyzing…');
    setQuickIndex((previous) => {
      if (QUICK_QUESTIONS.length <= 1) return 0;
      let next = Math.floor(Math.random() * QUICK_QUESTIONS.length);
      if (next === previous) next = (next + 1) % QUICK_QUESTIONS.length;
      return next;
    });
    setLoading(false);
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    setClearingMemory(false);
    setClearDialogOpen(false);
  };


  const ticketPrompt = (content: string): ChatMessage => ({
    id: makeId(),
    role: 'assistant',
    content,
  });

  const beginTicketFlow = (baseMessages = messages) => {
    if (loading) return;
    setError('');
    setTicketDraft(EMPTY_TICKET);
    setTicketStep('name');
    setMessages([...baseMessages, ticketPrompt('I can create a support ticket for you. What is your full name?')]);
  };

  const continueTicketFlow = async (value: string, baseMessages: ChatMessage[]) => {
    const answer = value.trim();
    const askAgain = (content: string) => setMessages([...baseMessages, ticketPrompt(content)]);

    if (ticketStep === 'name') {
      if (answer.length < 2) return askAgain('Please enter your full name so I can attach it to the ticket.');
      setTicketDraft((draft) => ({ ...draft, name: answer }));
      setTicketStep('email');
      return askAgain('What email address should the support team use for replies?');
    }

    if (ticketStep === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) return askAgain('That email address does not look complete. Please enter a valid email address.');
      setTicketDraft((draft) => ({ ...draft, email: answer }));
      setTicketStep('category');
      return askAgain(`Choose a category: ${TICKET_CATEGORIES.join(', ')}.`);
    }

    if (ticketStep === 'category') {
      const category = TICKET_CATEGORIES.find((item) => item.toLowerCase() === answer.toLowerCase());
      if (!category) return askAgain(`Please choose one of these categories: ${TICKET_CATEGORIES.join(', ')}.`);
      setTicketDraft((draft) => ({ ...draft, category }));
      setTicketStep('subject');
      return askAgain('Give your request a short subject.');
    }

    if (ticketStep === 'subject') {
      if (answer.length < 3) return askAgain('Please enter a short subject with at least three characters.');
      setTicketDraft((draft) => ({ ...draft, subject: answer }));
      setTicketStep('message');
      return askAgain('Finally, describe what happened and what you need help with.');
    }

    if (ticketStep === 'confirm') {
      if (/^(cancel|no|stop)$/i.test(answer)) {
        setTicketStep('idle');
        setTicketDraft(EMPTY_TICKET);
        return askAgain('Support-ticket creation cancelled. No ticket was created.');
      }

      if (!/^(confirm|yes|submit|create)$/i.test(answer)) {
        return askAgain('Type **Confirm** to create this support ticket, or **Cancel** to stop.');
      }

      setTicketStep('creating');
      setLoading(true);

      try {
        const response = await fetch('/api/aio/support-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ticketDraft, confirmed: true }),
        });
        const data = await response.json();

        if (!response.ok || !data?.success || !data?.ticketId) {
          throw new Error(data?.error || 'AIO could not create the support ticket.');
        }

        window.sessionStorage.setItem(
          'auronix-support-handoff',
          JSON.stringify({ ticketId: data.ticketId, subject: ticketDraft.subject })
        );
        setMessages([
          ...baseMessages,
          ticketPrompt(
            `Your support ticket was created successfully. Reference: **${data.ticketId}**.\n\n[Open Support Chat](/support/chat)`
          ),
        ]);
        setTicketStep('idle');
        setTicketDraft(EMPTY_TICKET);
      } catch (caught) {
        setTicketStep('confirm');
        askAgain(
          caught instanceof Error
            ? userFacingError(caught)
            : 'AIO could not create the support ticket. Please try again.'
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    if (ticketStep !== 'message') return;
    if (answer.length < 10) {
      return askAgain('Please add a little more detail so the team can understand the issue.');
    }

    const completedTicket = { ...ticketDraft, message: answer };
    setTicketDraft(completedTicket);
    setTicketStep('confirm');
    return askAgain(
      [
        '**Review this support ticket before submission:**',
        `- **Category:** ${completedTicket.category}`,
        `- **Subject:** ${completedTicket.subject}`,
        `- **Reply email:** ${completedTicket.email}`,
        '',
        'Type **Confirm** to create the ticket or **Cancel** to stop.',
      ].join('\n')
    );
  };

  const submitTicketValue = (value: string) => {
    if (loading || ticketStep === 'idle' || ticketStep === 'creating') return;
    const userMessage: ChatMessage = { id: makeId(), role: 'user', content: value };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    void continueTicketFlow(value, nextMessages);
  };

  const sendMessage = async (
    event?: FormEvent
  ) => {
    event?.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setError('');
    setInput('');

    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: text,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    if (ticketStep !== 'idle') {
      await continueTicketFlow(text, nextMessages);
      return;
    }

    if (TICKET_INTENT.test(text)) {
      beginTicketFlow(nextMessages);
      return;
    }

    setLoading(true);
    setActivityLabel('AIO is analyzing…');
    setActiveAnswerSource('general');
    setVisibleAnswer('');

    currentAnswerRef.current = '';
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = '';

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let streamedAnswer = '';
    let streamedSources: AioSource[] = [];
    let streamedActions: AioAction[] = [];
    let streamedRequestId = makeId();
    let streamedAnswerSource: 'premade' | 'auronix' | 'general' = 'general';

    try {
      const token = auth.currentUser
        ? await auth.currentUser.getIdToken().catch(() => null)
        : null;

      const response = await fetch('/api/aio/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pathname,
          conversationId: conversationIdRef.current,
          requestId: streamedRequestId,
          messages: nextMessages
            .filter((message) => !message.sessionBoundary && message.content.trim())
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
          context: {
            selectedText: selectionRequest?.selectedText || undefined,
            pageTitle:
              typeof document !== 'undefined'
                ? document.title.slice(0, 240)
                : undefined,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = 'Unable to get an AIO response.';
        try {
          const data = await response.json();
          if (typeof data?.error === 'string') message = data.error;
        } catch {
          // The public error above is intentionally generic.
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error('AIO streaming is unavailable in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleEvent = (event: AioStreamEvent) => {
        if (event.type === 'message_start') {
          streamedRequestId = event.requestId;
          currentRequestIdRef.current = event.requestId;
          return;
        }

        if (event.type === 'status') {
          setActivityLabel(event.label);
          return;
        }

        if (event.type === 'source') {
          if (!streamedSources.some((source) => source.id === event.source.id)) {
            streamedSources = [...streamedSources, event.source];
            currentSourcesRef.current = streamedSources;
          }
          return;
        }

        if (event.type === 'action') {
          if (!streamedActions.some((action) => action.id === event.action.id)) {
            streamedActions = [...streamedActions, event.action];
            currentActionsRef.current = streamedActions;
          }
          return;
        }

        if (event.type === 'token') {
          streamedAnswer += event.token;
          currentAnswerRef.current = streamedAnswer;
          setVisibleAnswer(streamedAnswer);
          return;
        }

        if (event.type === 'message_complete') {
          streamedAnswerSource = event.answerSource;
          setActiveAnswerSource(event.answerSource);
          return;
        }

        if (event.type === 'error') {
          throw new Error(event.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const dataLine = frame
            .split('\n')
            .find((line) => line.startsWith('data: '));

          if (!dataLine) continue;

          let event: AioStreamEvent;
          try {
            event = JSON.parse(dataLine.slice(6)) as AioStreamEvent;
          } catch {
            continue;
          }

          handleEvent(event);
        }

        if (done) break;
      }

      if (!streamedAnswer.trim()) {
        throw new Error('AIO returned an empty response.');
      }

      setMessages((existing) => [
        ...existing,
        {
          id: streamedRequestId,
          role: 'assistant',
          content: streamedAnswer.trim(),
          answerSource: streamedAnswerSource,
          sources: streamedSources,
          actions: streamedActions,
          requestId: streamedRequestId,
        },
      ]);

      currentAnswerRef.current = '';
      currentSourcesRef.current = [];
      currentActionsRef.current = [];
      currentRequestIdRef.current = '';
      setVisibleAnswer('');
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      if (streamedAnswer.trim()) {
        setMessages((existing) => [
          ...existing,
          {
            id: streamedRequestId,
            role: 'assistant',
            content: streamedAnswer.trim(),
            answerSource: streamedAnswerSource,
            sources: streamedSources,
            actions: streamedActions,
            requestId: streamedRequestId,
            interrupted: true,
          },
        ]);
      }

      currentAnswerRef.current = '';
      currentSourcesRef.current = [];
      currentActionsRef.current = [];
      currentRequestIdRef.current = '';
      setVisibleAnswer('');
      setError(
        caught instanceof Error
          ? userFacingError(caught)
          : 'AIO is temporarily unable to respond.'
      );
    } finally {
      setLoading(false);
      setActivityLabel('AIO is analyzing…');

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const startNewChat = () => {
    if (loading) return;
    abortRef.current?.abort();
    conversationIdRef.current = makeId();
    currentAnswerRef.current = '';
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = '';
    setVisibleAnswer('');
    setError('');
    setTicketStep('idle');
    setTicketDraft(EMPTY_TICKET);
    setInput('');
    setMessages((existing) => {
      const hasConversation = existing.some(
        (message) => !message.sessionBoundary && message.content.trim()
      );

      return hasConversation
        ? [
            ...existing,
            {
              id: makeId(),
              role: 'assistant',
              content: '',
              sessionBoundary: true,
              endedAt: Date.now(),
            },
          ]
        : existing;
    });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submitFeedback = async (
    message: ChatMessage,
    rating: 'helpful' | 'not_helpful'
  ) => {
    if (!message.requestId) return;

    try {
      await fetch('/api/aio/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: message.requestId,
          conversationId: conversationIdRef.current,
          rating,
        }),
      });
    } catch {
      // Feedback is optional and must never break the conversation.
    }
  };

  const regenerateMessage = (messageIndex: number) => {
    if (loading) return;

    for (let index = messageIndex - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (candidate?.role === 'user' && candidate.content.trim()) {
        setMessages((existing) => existing.slice(0, messageIndex));
        setInput(candidate.content);
        window.setTimeout(() => {
          document
            .querySelector<HTMLFormElement>('[data-auronix-ai-form]')
            ?.requestSubmit();
        }, 40);
        return;
      }
    }
  };

  const askQuick = (
    question: string
  ) => {
    if (loading) {
      return;
    }

    setInput(question);

    window.setTimeout(() => {
      const form =
        document.querySelector<HTMLFormElement>(
          '[data-auronix-ai-form]'
        );

      form?.requestSubmit();
    }, 40);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{
              opacity: 0,
              scale: 0.82,
              y: 8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.82,
              y: 8,
            }}
            whileHover={{
              scale: 1.06,
              y: -2,
            }}
            whileTap={{
              scale: 0.94,
            }}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open Auronix AI chat"
            className="auronix-ai-launcher flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 text-primary-foreground shadow-[0_14px_42px_rgba(0,0,0,0.22)]"
          >
            <div className="absolute inset-1 rounded-full bg-white/15" />

            <ChatBrandMark className="h-10 w-10" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            transition={{
              type:
                'spring',
              stiffness: 280,
              damping: 28,
            }}
            role="dialog" aria-label="Auronix AI chat"
            className="auronix-ai-window fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-[80] mx-auto flex h-[min(680px,calc(100dvh-1.5rem))] max-w-[430px] flex-col overflow-hidden rounded-[26px] border border-border bg-background/96 font-sans text-foreground shadow-[0_25px_80px_rgba(0,0,0,0.24)] sm:bottom-5 sm:left-auto sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                  <div className="absolute inset-1 rounded-full bg-accent/10" />
                  <ChatBrandMark className="h-9 w-9" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-sans text-sm font-bold">
                    Auronix Intelligence One
                  </div>

                  <div className="font-sans text-[10px] text-foreground-muted">
                    AIO • Online
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={startNewChat}
                  disabled={loading}
                  aria-label="Start a new AIO conversation"
                  title="New chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => beginTicketFlow()}
                  disabled={loading || ticketStep !== 'idle'}
                  aria-label="Create a support ticket"
                  title="Create a support ticket"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                >
                  <Ticket className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={clearingMemory}
                  aria-label="Clear saved AI chat memory"
                  title="Clear saved chat memory"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 font-sans text-xs font-semibold text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-wait disabled:opacity-65"
                >
                  {clearingMemory ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  <span className="ac-popup-clear-label">{clearingMemory ? 'Clearing…' : 'Clear'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  aria-label="Close Auronix AI chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 transition-colors hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.length === 0 &&
                !visibleAnswer &&
                !error && (
                <div className="flex min-h-full flex-col justify-end">
                    <div className="ac-content-panel p-4">
                      <div className="flex items-center gap-2 font-sans text-sm font-bold">
                        <MessageCircle className="h-4 w-4 text-accent" />
                        How can I help?
                      </div>

                      <p className="mt-2 font-sans text-sm leading-6 text-foreground-muted">
                        Ask about Auronix Commerce, suppliers, sellers, partnerships, policies, or any public page.
                      </p>
                      <button type="button" className="ac-ai-ticket-action" onClick={() => beginTicketFlow()}>
                        <Ticket className="h-4 w-4" /> Create a support ticket
                      </button>
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                {messages.map(
                  (message) => message.sessionBoundary ? (
                    <div key={message.id} className="flex items-center gap-3 py-1" role="separator" aria-label="Previous chat ended">
                      <span className="h-px flex-1 bg-border" />
                      <span className="shrink-0 rounded-full border border-border bg-secondary/50 px-3 py-1 font-sans text-[10px] font-medium text-foreground-muted">
                        Previous chat ended · New chat
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    <div
                      key={message.id}
                      className={
                        message.role ===
                        'user'
                          ? 'flex justify-end'
                          : 'flex justify-start'
                      }
                    >
                      <div
                        className={
                          message.role ===
                          'user'
                            ? 'max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 font-sans text-sm leading-6 text-primary-foreground'
                            : 'max-w-[96%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 font-sans text-sm leading-6 text-foreground'
                        }
                      >
                        {message.role ===
                        'assistant' ? (
                          <div className="font-sans">
                            {message.answerSource && (
                              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                                <Sparkles className="h-3 w-3 text-accent" />
                                {message.answerSource === 'auronix'
                                  ? 'Verified Auronix context'
                                  : message.answerSource === 'premade'
                                    ? 'Auronix knowledge'
                                    : 'General guidance'}
                                {message.interrupted ? ' · Stopped' : ''}
                              </div>
                            )}
                            {renderMarkdown(message.content)}
                            <AioMessageSources sources={message.sources || []} />
                            <AioMessageActions
                              actions={message.actions || []}
                              onNavigate={(href) => router.push(href)}
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/60 pt-2 text-foreground-muted">
                              <MessageUtilityButton
                                label="Copy"
                                onClick={() => void navigator.clipboard?.writeText(message.content)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </MessageUtilityButton>
                              <MessageUtilityButton
                                label="Regenerate"
                                onClick={() => regenerateMessage(messages.indexOf(message))}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </MessageUtilityButton>
                              <MessageUtilityButton
                                label="Helpful"
                                onClick={() => void submitFeedback(message, 'helpful')}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </MessageUtilityButton>
                              <MessageUtilityButton
                                label="Not helpful"
                                onClick={() => void submitFeedback(message, 'not_helpful')}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </MessageUtilityButton>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {loading &&
                  visibleAnswer && (
                    <div className="flex justify-start">
                      <div className="ac-content-panel max-w-[96%] px-4 py-3 font-sans text-sm leading-6 text-foreground">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                          <Sparkles className="h-3 w-3 text-accent" />
                          {activityLabel || 'AIO is responding…'}
                        </div>

                        <div className="font-sans">
                          {renderMarkdown(
                            visibleAnswer,
                            true
                          )}
                        </div>

                        <motion.span
                          animate={{
                            opacity: [
                              0.2,
                              1,
                              0.2,
                            ],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat:
                              Infinity,
                          }}
                          className="ml-1 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-accent"
                        />
                      </div>
                    </div>
                  )}

                {loading &&
                  !visibleAnswer && (
                    <div className="flex justify-start">
                      <div className="ac-content-panel px-4 py-3">
                        <div className="flex items-center gap-2 font-sans text-sm text-foreground-muted">
                          <Spinner className="h-4 w-4" />
                          {activityLabel || 'AIO is analyzing…'}
                        </div>
                      </div>
                    </div>
                  )}

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-sans text-sm leading-6 text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {ticketStep === 'category' && (
                <div className="ac-ai-ticket-categories" aria-label="Ticket categories">
                  {TICKET_CATEGORIES.map((category) => (
                    <button type="button" key={category} onClick={() => submitTicketValue(category)}>{category}</button>
                  ))}
                </div>
              )}

              {ticketStep === 'confirm' && (
                <div className="ac-ai-ticket-categories" aria-label="Confirm support ticket">
                  <button type="button" onClick={() => submitTicketValue('Confirm')}>Confirm & create</button>
                  <button type="button" onClick={() => submitTicketValue('Cancel')}>Cancel</button>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border px-3 py-2">
              <AnimatePresence mode="wait">
                {quickQuestion && (
                <motion.button
                  key={quickQuestion}
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -4,
                  }}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    askQuick(
                      quickQuestion
                    )
                  }
                  className="w-full truncate rounded-xl px-2 py-2 text-left font-sans text-[11px] font-medium text-foreground-muted transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50"
                >
                  Quick question ·{' '}
                  {quickQuestion}
                </motion.button>
                )}
              </AnimatePresence>
            </div>

            <form
              data-auronix-ai-form
              onSubmit={sendMessage}
              className="flex shrink-0 items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target
                      .value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      'Enter' &&
                    !event.shiftKey && !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();

                    void sendMessage();
                  }
                }}
                aria-label="Your message"
                maxLength={5000}
                rows={1}
                disabled={loading}
                placeholder="Ask Auronix Intelligence One…"
                className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 font-sans text-[16px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60 sm:text-sm"
              />

              {loading ? (
                <button
                  type="button"
                  onClick={stopAnswer}
                  aria-label="Stop AI response"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary font-sans transition-colors hover:bg-secondary/70"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary font-sans text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={clearDialogOpen} onOpenChange={(nextOpen) => {
        if (!clearingMemory) setClearDialogOpen(nextOpen);
      }}>
        <AlertDialogContent className="max-w-[min(92vw,420px)] rounded-[26px] border-border bg-background p-6 shadow-[0_28px_100px_rgba(0,0,0,0.34)]">
          <AlertDialogHeader className="text-left">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight">
              Delete this chat history?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm leading-6 text-foreground-muted">
              This removes the saved Auronix AI conversation from this browser. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-2">
            <AlertDialogCancel disabled={clearingMemory} className="h-11 rounded-xl border-border bg-secondary/60 px-5 font-sans font-semibold">
              Keep chat
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={clearingMemory}
              onClick={(event) => {
                event.preventDefault();
                void clearChatMemory();
              }}
              className="h-11 rounded-xl bg-red-600 px-5 font-sans font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
            >
              {clearingMemory ? <Spinner className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {clearingMemory ? 'Clearing chat…' : 'Delete chat history'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AIChat;

function ChatBrandMark({ className }: { className?: string }) {
  return <span className={`relative inline-flex shrink-0 ${className || ''}`}><AuronixMark className="h-full w-full shadow-none" /><span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-accent text-white shadow-sm"><Bot className="h-2.5 w-2.5" /></span></span>;
}

function AioMessageSources({ sources }: { sources: AioSource[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-border/60 pt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground-muted transition hover:text-foreground"
        aria-expanded={open}
      >
        Sources · {sources.length}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((source) => {
            const href = source.route || source.url;
            return (
              <div key={source.id} className="rounded-xl border border-border bg-secondary/35 p-3">
                <div className="text-xs font-semibold">{source.title}</div>
                {source.excerpt && (
                  <div className="mt-1 line-clamp-3 text-[11px] leading-5 text-foreground-muted">
                    {source.excerpt}
                  </div>
                )}
                {href && (
                  <a
                    href={href}
                    target={source.url ? '_blank' : undefined}
                    rel={source.url ? 'noopener noreferrer' : undefined}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
                  >
                    Open source
                    {source.url ? <ExternalLink className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AioMessageActions({
  actions,
  onNavigate,
}: {
  actions: AioAction[];
  onNavigate: (href: string) => void;
}) {
  if (!actions.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          type="button"
          key={action.id}
          onClick={() => onNavigate(action.href)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/15"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

function MessageUtilityButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] transition hover:bg-secondary hover:text-foreground"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
