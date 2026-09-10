'use client';
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
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, LifeBuoy, ShieldCheck } from 'lucide-react';
import { AuronixMark } from '@/components/site/auronix-mark';
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
  answerSource?: 'found' | 'online';
  responseSeconds?: number;
  sessionBoundary?: boolean;
  endedAt?: number;
};

const CHAT_STORAGE_KEY = 'auronix-support-local-memory-v1';
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

export function SupportConversation({ seller = false, agentName = 'Alex', ticketReference = '' }: { seller?: boolean; agentName?: string; ticketReference?: string }) {
  const [open, setOpen] = useState(true);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(true);

  const [thinkingSeconds, setThinkingSeconds] =
    useState(0);

  const [completedThinkingSeconds, setCompletedThinkingSeconds] =
    useState(0);

  const [activeAnswerSource, setActiveAnswerSource] =
    useState<'found' | 'online'>('online');

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [clearingMemory, setClearingMemory] = useState(false);

  const [localMemoryReady, setLocalMemoryReady] = useState(false);

  const [visibleAnswer, setVisibleAnswer] =
    useState('');

  const [error, setError] = useState('');

  const [quickIndex, setQuickIndex] =
    useState(-1);

  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const typingTimerRef =
    useRef<number | null>(
      null
    );

  const currentAnswerRef = useRef('');

  const thinkingStartedAtRef = useRef(0);

  const introStartedRef = useRef(false);

  const pathname = usePathname() || '/';

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
      if (seller) return;
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
  }, [pathname, seller]);

  useEffect(() => {
    if (!localMemoryReady) return;
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    if (messages.length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;
    const timer = window.setTimeout(() => {
      setMessages([{ id: makeId(), role: 'assistant', content: ticketReference
        ? `Hi, I’m ${agentName}. I have your ticket reference ${ticketReference}. How may I help you today?`
        : `Hi, I’m ${agentName}. How may I help you today?` }]);
      setLoading(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [agentName, localMemoryReady, messages.length, ticketReference]);

  useEffect(() => {
    if (!localMemoryReady || seller) return;
    try {
      window.localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES))
      );
    } catch {
      // Ignore browser quota or privacy-mode storage failures.
    }
  }, [messages, localMemoryReady, seller]);

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

  const clearChatMemory = async () => {
    if (clearingMemory) return;
    setClearingMemory(true);
    abortRef.current?.abort();

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 650));

    currentAnswerRef.current = '';
    setMessages([]);
    setVisibleAnswer('');
    setInput('');
    setError('');
    setThinkingSeconds(0);
    setCompletedThinkingSeconds(0);
    setQuickIndex((previous) => {
      if (QUICK_QUESTIONS.length <= 1) return 0;
      let next = Math.floor(Math.random() * QUICK_QUESTIONS.length);
      if (next === previous) next = (next + 1) % QUICK_QUESTIONS.length;
      return next;
    });
    setLoading(false);
    if (!seller) window.localStorage.removeItem(CHAT_STORAGE_KEY);
    setClearingMemory(false);
    setClearDialogOpen(false);
  };

  const typeAnswer = (
    answer: string,
    answerSource: 'found' | 'online',
    responseSeconds: number
  ) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    currentAnswerRef.current = answer;
    setVisibleAnswer('');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 0 : Math.min(1800, 750 + answer.length * 3);
    typingTimerRef.current = window.setTimeout(() => {
      setMessages((existing) => [...existing, {
        id: makeId(), role: 'assistant', content: answer, answerSource, responseSeconds,
      }]);
      typingTimerRef.current = null;
      currentAnswerRef.current = '';
      setLoading(false);
    }, delay);
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
          '[data-auronix-support-form]'
        );

      form?.requestSubmit();
    }, 40);
  };

  return (
    <>
      <section className="ac-conversation" aria-label={seller ? 'Seller AI support' : 'Auronix AI support'}>
        <header className="ac-conversation-header">
          <div className="ac-assistant-identity"><ChatBrandMark className="h-11 w-11"/><div><strong>{agentName} · Support Agent</strong><span>{seller ? 'Seller guidance' : 'Support chat'} · Auronix AI support</span></div></div>
          <div className="ac-chat-actions"><Link href={seller ? '/seller/support' : '/support/contact'} className="ac-chat-team"><LifeBuoy size={17}/> Contact support</Link><button type="button" className="ac-icon-button" aria-label="Clear saved AI chat memory" disabled={clearingMemory} onClick={()=>setClearDialogOpen(true)}><Trash2 size={18}/></button></div>
        </header>
        <div className="ac-chat-scroll" ref={scrollRef} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
          {messages.length===0&&!loading&&!visibleAnswer&&!error&&<div className="ac-chat-welcome"><span className="ac-eyebrow">AURONIX SUPPORT</span><h2>Hi, how can I help?</h2><p>{seller ? 'Ask about your seller workspace, catalogs, verification or support. For account-specific help, contact the support team.' : 'I’m Auronix’s AI support assistant. Tell me what you need help with, or choose a topic below.'}</p><div className="ac-chat-suggestions">{(seller?['How do I update my catalog?','Where is my application status?','How do I contact seller support?']:['How can I become a supplier?','What does Auronix Commerce do?','Where can I verify the company?']).map(question=><button type="button" key={question} onClick={()=>askQuick(question)}>{question}<ArrowRight size={16}/></button>)}</div></div>}
          <div className="ac-chat-messages">{messages.map(message=>message.sessionBoundary?<div key={message.id} className="ac-chat-boundary" role="separator" aria-label="Previous chat ended">Previous chat ended · New chat</div>:<article key={message.id} className="ac-message" data-role={message.role}><div className="ac-message-label">{message.role==='user'?'You':agentName}</div><div className="ac-message-content">{message.role==='assistant'?renderMarkdown(message.content):<p className="whitespace-pre-wrap">{message.content}</p>}</div>{message.role==='assistant'&&<MessageCopy content={message.content}/>}</article>)}</div>
          {loading&&<article className="ac-message" data-role="assistant"><div className="ac-message-label">{agentName}</div>{visibleAnswer?<div className="ac-message-content">{renderMarkdown(visibleAnswer,true)}</div>:<div className="ac-chat-thinking" role="status"><Spinner className="w-5 h-5"/> {agentName} is typing…</div>}</article>}
          {error&&<div className="ac-chat-error" role="alert"><strong>We couldn’t complete that reply.</strong><p>{error}</p><button type="button" onClick={()=>{const last=[...messages].reverse().find(m=>m.role==='user');if(last)setInput(last.content);setError('');}}>Edit and try again</button></div>}
        </div>
        <div className="ac-composer-area"><form data-auronix-support-form onSubmit={sendMessage} className="ac-composer"><textarea aria-label="Your message" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void sendMessage();}}} rows={1} maxLength={5000} disabled={loading} placeholder="Your message…"/>{loading?<button type="button" aria-label="Stop AI response" onClick={stopAnswer}><Square size={18}/></button>:<button type="submit" aria-label="Send message" disabled={!input.trim()}><ArrowRight size={21}/></button>}</form><p><ShieldCheck size={13}/> AI can make mistakes. Never share passwords or verification codes.{seller?' This conversation is not saved.':' History is saved in this browser.'}</p></div>
      </section>
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
              This removes this Auronix AI conversation. This action cannot be undone.
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

function MessageCopy({content}:{content:string}) { const [copied,setCopied]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>>();useEffect(()=>()=>clearTimeout(timer.current),[]);return <button type="button" className="ac-message-copy" aria-label="Copy answer" onClick={async()=>{try{await navigator.clipboard.writeText(content);setCopied(true);timer.current=setTimeout(()=>setCopied(false),1800);}catch{setCopied(false);}}}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?'Copied':'Copy'}</span></button>; }


function ChatBrandMark({ className }: { className?: string }) {
  return <span className={`relative inline-flex shrink-0 ${className || ''}`}><AuronixMark className="h-full w-full shadow-none" /><span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-accent text-white shadow-sm"><Bot className="h-2.5 w-2.5" /></span></span>;
}
