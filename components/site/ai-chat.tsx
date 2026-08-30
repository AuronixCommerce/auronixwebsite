'use client';

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
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import { AuronixMark } from '@/components/site/auronix-mark';

type Role = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  answerSource?: 'found' | 'online';
  responseSeconds?: number;
  sessionBoundary?: boolean;
  endedAt?: number;
};

const CHAT_STORAGE_KEY = 'auronix-ai-local-memory-v1';
const MAX_LOCAL_MESSAGES = 60;

const QUICK_QUESTIONS = [
  'What does Auronix Commerce do?',
  'How can I become a supplier?',
  'How can I become a seller?',
  'What is the seller application process?',
  'How can I contact Auronix?',
  'Can you explain your marketplace expertise?',
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

export function AIChat() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(false);

  const [thinkingSeconds, setThinkingSeconds] =
    useState(0);

  const [completedThinkingSeconds, setCompletedThinkingSeconds] =
    useState(0);

  const [activeAnswerSource, setActiveAnswerSource] =
    useState<'found' | 'online'>('online');

  const [localMemoryReady, setLocalMemoryReady] = useState(false);

  const [visibleAnswer, setVisibleAnswer] =
    useState('');

  const [error, setError] = useState('');

  const [quickIndex, setQuickIndex] =
    useState(0);

  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const typingTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const currentAnswerRef = useRef('');

  const thinkingStartedAtRef = useRef(0);

  const pathname =
    typeof window !== 'undefined'
      ? window.location.pathname
      : '/';

  const quickQuestion = useMemo(
    () =>
      QUICK_QUESTIONS[
        quickIndex % QUICK_QUESTIONS.length
      ],
    [quickIndex]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuickIndex(
        (value) => value + 1
      );
    }, 30000);

    return () =>
      window.clearInterval(timer);
  }, []);

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
  }, []);

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
    if (!loading || visibleAnswer) {
      return;
    }

    const startedAt = Date.now();
    setThinkingSeconds(0);

    const timer = window.setInterval(() => {
      setThinkingSeconds(
        Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
      );
    }, 250);

    return () => window.clearInterval(timer);
  }, [loading, visibleAnswer]);

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

      if (typingTimerRef.current) {
        clearInterval(
          typingTimerRef.current
        );
      }
    };
  }, []);

  const stopAnswer = () => {
    abortRef.current?.abort();

    if (typingTimerRef.current) {
      clearInterval(
        typingTimerRef.current
      );

      typingTimerRef.current = null;
    }

    // Keep only what the visitor has actually seen. The full answer is already
    // buffered in currentAnswerRef while the typewriter animation is running.
    const partial = visibleAnswer;

    if (partial.trim()) {
      setMessages((existing) => [
        ...existing,
        {
          id: makeId(),
          role: 'assistant',
          content: partial,
          answerSource: activeAnswerSource,
          responseSeconds: completedThinkingSeconds || 1,
        },
      ]);
    }

    currentAnswerRef.current = '';

    setVisibleAnswer('');

    setThinkingSeconds(0);

    setLoading(false);
  };

  const clearChatMemory = () => {
    if (!window.confirm('Clear this saved AI conversation from this browser?')) {
      return;
    }

    abortRef.current?.abort();

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    currentAnswerRef.current = '';
    setMessages([]);
    setVisibleAnswer('');
    setInput('');
    setError('');
    setThinkingSeconds(0);
    setCompletedThinkingSeconds(0);
    setLoading(false);
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const typeAnswer = (
    answer: string,
    answerSource: 'found' | 'online',
    responseSeconds: number
  ) => {
    if (typingTimerRef.current) {
      clearInterval(
        typingTimerRef.current
      );
    }

    currentAnswerRef.current = answer;

    setVisibleAnswer('');

    let cursor = 0;

    typingTimerRef.current =
      setInterval(() => {
        if (cursor >= answer.length) {
          if (typingTimerRef.current) {
            clearInterval(
              typingTimerRef.current
            );

            typingTimerRef.current = null;
          }

          setMessages((existing) => [
            ...existing,
            {
              id: makeId(),
              role: 'assistant',
              content: answer,
              answerSource,
              responseSeconds,
            },
          ]);

          currentAnswerRef.current = '';

          setVisibleAnswer('');

          setLoading(false);

          return;
        }

        const remaining =
          answer.length - cursor;

        let amount = 1;

        if (
          answer[cursor] === '\n' ||
          answer[cursor] === ' '
        ) {
          amount = 1;
        } else if (remaining > 180) {
          amount = 3;
        } else if (remaining > 80) {
          amount = 2;
        }

        cursor = Math.min(
          answer.length,
          cursor + amount
        );

        setVisibleAnswer(
          answer.slice(0, cursor)
        );
      }, 22);
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

    setLoading(true);

    setThinkingSeconds(0);

    setCompletedThinkingSeconds(0);

    setActiveAnswerSource('online');

    thinkingStartedAtRef.current = Date.now();

    setVisibleAnswer('');

    currentAnswerRef.current = '';

    abortRef.current?.abort();

    const controller =
      new AbortController();

    abortRef.current = controller;

    try {
      const response = await fetch(
        '/api/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body: JSON.stringify({
            pathname,

            messages:
              nextMessages.filter((message) => !message.sessionBoundary && message.content.trim()).map(
                (message) => ({
                  role:
                    message.role,

                  content:
                    message.content,
                })
              ),
          }),

          signal:
            controller.signal,
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'The AI server returned an invalid response.'
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            'Unable to get an AI response.'
        );
      }

      const answer =
        typeof data.response === 'string'
          ? data.response.trim()
          : '';

      if (!answer) {
        throw new Error(
          'The AI returned an empty response.'
        );
      }

      const responseSeconds = Math.max(
        1,
        Math.round(
          (Date.now() - thinkingStartedAtRef.current) / 1000
        )
      );
      const answerSource = data.answerSource === 'premade-memory'
        ? 'found'
        : 'online';

      setCompletedThinkingSeconds(responseSeconds);
      setActiveAnswerSource(answerSource);
      typeAnswer(answer, answerSource, responseSeconds);
    } catch (caught) {
      if (
        controller.signal.aborted
      ) {
        return;
      }

      setLoading(false);

      setVisibleAnswer('');

      currentAnswerRef.current = '';

      setError(
        caught instanceof Error
          ? caught.message
          : 'Sorry, I am temporarily unable to respond.'
      );
    } finally {
      if (
        abortRef.current === controller
      ) {
        abortRef.current = null;
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
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[80] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-primary text-primary-foreground shadow-[0_14px_50px_rgba(0,0,0,0.25)]"
          >
            <motion.div
              animate={{
                scale: [
                  0.92,
                  1.15,
                  0.92,
                ],
                opacity: [
                  0.16,
                  0.32,
                  0.16,
                ],
              }}
              transition={{
                duration: 2.7,
                repeat: Infinity,
                ease:
                  'easeInOut',
              }}
              className="absolute inset-1 rounded-full bg-white/20 blur-md"
            />

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
            className="auronix-ai-window fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-[80] mx-auto flex h-[min(680px,calc(100dvh-1.5rem))] max-w-[430px] flex-col overflow-hidden rounded-[26px] border border-border bg-background/96 font-sans text-foreground shadow-[0_25px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [
                        0.9,
                        1.08,
                        0.9,
                      ],
                      opacity: [
                        0.7,
                        1,
                        0.7,
                      ],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease:
                        'easeInOut',
                    }}
                    className="absolute inset-1 rounded-full bg-accent/10 blur-sm"
                  />
                  <ChatBrandMark className="h-9 w-9" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-sans text-sm font-bold">
                    Auronix AI
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                  </div>

                  <div className="font-sans text-[10px] text-foreground-muted">
                    Commerce assistant
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={clearChatMemory}
                  aria-label="Clear saved AI chat memory"
                  title="Clear saved chat memory"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 font-sans text-xs font-semibold text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
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
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 font-sans text-sm font-bold">
                        <MessageCircle className="h-4 w-4 text-accent" />
                        How can I help?
                      </div>

                      <p className="mt-2 font-sans text-sm leading-6 text-foreground-muted">
                        Ask about Auronix Commerce, suppliers, sellers, partnerships, policies, or any public page.
                      </p>
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
                                Thought for {message.responseSeconds || 1} sec · {message.answerSource === 'found' ? 'Found' : 'Online'}
                              </div>
                            )}
                            {renderMarkdown(
                              message.content
                            )}
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
                      <div className="max-w-[96%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 font-sans text-sm leading-6 text-foreground">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                          <Sparkles className="h-3 w-3 text-accent" />
                          Thought for {completedThinkingSeconds || 1} sec · {activeAnswerSource === 'found' ? 'Found' : 'Online'}
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
                      <div className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex items-center gap-2 font-sans text-sm text-foreground-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Thinking… {thinkingSeconds}s
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
            </div>

            <div className="shrink-0 border-t border-border px-3 py-2">
              <AnimatePresence mode="wait">
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
              </AnimatePresence>
            </div>

            <form
              data-auronix-ai-form
              onSubmit={sendMessage}
              className="flex shrink-0 items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <textarea
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
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    void sendMessage();
                  }
                }}
                rows={1}
                disabled={loading}
                placeholder="Ask Auronix AI…"
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
    </>
  );
}

export default AIChat;

function ChatBrandMark({ className }: { className?: string }) {
  return <span className={`relative inline-flex shrink-0 ${className || ''}`}><AuronixMark className="h-full w-full shadow-none" /><span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-accent text-white shadow-sm"><Bot className="h-2.5 w-2.5" /></span></span>;
}
