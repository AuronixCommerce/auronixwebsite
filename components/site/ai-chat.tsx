"use client";
import { CustomerActionSecurity } from "./customer-action-security";
import { CustomerActionPanel,type CustomerActionSelection } from './customer-action-panel';
import { isCustomerActionKind,type CustomerActionKind,CUSTOMER_ACTIONS } from '@/lib/aio/customer-actions';
import { AIO_MODELS, normalizeAioModelId } from "@/lib/aio/models";
import { AIMessageContent } from "./ai-message-content";
import {
  CHAT_PREFERENCES_KEY,
  DEFAULT_CHAT_PREFERENCES,
  normalizeChatPreferences,
  currentChatContext,
  type ChatPreferences,
} from "@/lib/aio/preferences";
import { normalizeVerificationCode } from "@/lib/aio/verification-code";
import { paceAioEvents } from "@/lib/aio/pace";
import { readAioStream } from "@/lib/aio/stream";
import { userFacingError } from "@/lib/user-facing-error";
import { Spinner } from "@/components/design/primitives";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Settings2,
  Maximize2,
  Minimize2,
  Check,
  ArrowDown,
  Download,
  Mail,
  ShieldCheck,
  Plus,
  RefreshCw,
  Ticket,
  Send,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuronixMark } from "@/components/site/auronix-mark";
import type { AioSelectionRequest } from "@/lib/aio-selection";
import { auth } from "@/lib/firebase";
import type { AioAction, AioSource, AioStreamEvent } from "@/lib/aio/types";
import { TICKET_CATEGORIES } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  truncated?: boolean;
  answerSource?: "premade" | "auronix" | "general";
  sources?: AioSource[];
  actions?: AioAction[];
  requestId?: string;
  interrupted?: boolean;
  sessionBoundary?: boolean;
  endedAt?: number;
  pinned?: boolean;
  customerAction?:CustomerActionKind;
};

type TicketStep =
  | "idle"
  | "name"
  | "email"
  | "category"
  | "subject"
  | "message"
  | "confirm"
  | "creating";
type TicketDraft = {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
};

const EMPTY_TICKET: TicketDraft = {
  name: "",
  email: "",
  category: "",
  subject: "",
  message: "",
};
const TICKET_INTENT =
  /\b(create|open|submit|raise|make)\b.{0,24}\b(ticket|support request)\b/i;

const CHAT_STORAGE_KEY = "auronix-ai-local-memory-v1";
const MAX_LOCAL_MESSAGES = 60;

const QUICK_QUESTIONS = [
  "What does Auronix Commerce do?",
  "How can I become a supplier?",
  "How can I become a seller?",
  "What is the seller application process?",
  "How can I contact Auronix?",
  "Can you explain your marketplace expertise?",
  "Where can I explore Auronix product selections?",
  "How does the Auronix Amazon affiliate shop work?",
  "Where can I find seller troubleshooting guides?",
  "How do I resume a saved seller application?",
  "What partnership opportunities are available?",
  "Where can I read Auronix policies?",
  "Is there any scheduled maintenance?",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AIChat({
  initiallyOpen = false,
  presentation = "popup",
  selectionRequest = null,
  savedConversation = null,
}: {
  initiallyOpen?: boolean;
  presentation?: "popup" | "page";
  selectionRequest?: AioSelectionRequest | null;
  savedConversation?: { id: string; messages: any[] } | null;
} = {}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [selectedContext, setSelectedContext] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptSecurityToken, setTranscriptSecurityToken] = useState("");
  const [transcriptSecurityReset, setTranscriptSecurityReset] = useState(0);
  const [transcriptEmail, setTranscriptEmail] = useState("");
  const [transcriptCode, setTranscriptCode] = useState("");
  const [transcriptChallenge, setTranscriptChallenge] = useState("");
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [transcriptNotice, setTranscriptNotice] = useState("");
  const [transcriptSent, setTranscriptSent] = useState(false);
  const [customerAction,setCustomerAction]=useState<CustomerActionSelection|null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState<ChatPreferences>(
    DEFAULT_CHAT_PREFERENCES,
  );
  const [copiedId, setCopiedId] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [stickToBottom, setStickToBottom] = useState(true);
  const [retryMessages, setRetryMessages] = useState<ChatMessage[] | null>(
    null,
  );
  const feedbackPending = useRef(new Set<string>());
  const requestVersion = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(presentation === "page" || initiallyOpen);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const resize = () => {
      root.style.setProperty(
        "--ac-chat-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      root.style.setProperty(
        "--ac-chat-viewport-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
        else if (presentation !== "page") setOpen(false);
      }
    };
    resize();
    const focusFrame = window.requestAnimationFrame(() => {
      if (!settingsOpen) inputRef.current?.focus();
    });
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    document.addEventListener("keydown", escape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      document.removeEventListener("keydown", escape);
      root.style.removeProperty("--ac-chat-viewport-height");
      root.style.removeProperty("--ac-chat-viewport-top");
    };
  }, [open, settingsOpen, presentation]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [loading, setLoading] = useState(false);

  const [activityLabel, setActivityLabel] = useState("AIO is analyzing…");

  const [activeAnswerSource, setActiveAnswerSource] = useState<
    "premade" | "auronix" | "general"
  >("general");

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [clearingMemory, setClearingMemory] = useState(false);

  const [localMemoryReady, setLocalMemoryReady] = useState(false);

  const [visibleAnswer, setVisibleAnswer] = useState("");

  const [error, setError] = useState("");

  const [ticketStep, setTicketStep] = useState<TicketStep>("idle");
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>(EMPTY_TICKET);

  const [quickIndex, setQuickIndex] = useState(-1);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const currentAnswerRef = useRef("");
  const currentSourcesRef = useRef<AioSource[]>([]);
  const currentActionsRef = useRef<AioAction[]>([]);
  const currentRequestIdRef = useRef("");
  const conversationIdRef = useRef(makeId());

  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!localMemoryReady || !selectionRequest?.prompt) {
      return;
    }

    setOpen(true);
    if (selectionRequest.model)
      setPreferences((current) => ({
        ...current,
        model: normalizeAioModelId(selectionRequest.model),
      }));
    setSelectedContext(selectionRequest.selectedText || "");
    setError("");
    setTicketStep("idle");
    setTicketDraft(EMPTY_TICKET);
    setInput(selectionRequest.prompt);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        selectionRequest.prompt.length,
        selectionRequest.prompt.length,
      );
    });
  }, [selectionRequest, localMemoryReady]);

  const quickQuestion = useMemo(
    () => (quickIndex >= 0 ? QUICK_QUESTIONS[quickIndex] : ""),
    [quickIndex],
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

    return () => window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    try {
      const savedPreferences = normalizeChatPreferences(
        JSON.parse(window.localStorage.getItem(CHAT_PREFERENCES_KEY) || "null"),
      );
      setPreferences(savedPreferences);
      if (!savedPreferences.rememberHistory) return;
      const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        const restored = parsed
          .filter(
            (message: any) =>
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string",
          )
          .slice(-MAX_LOCAL_MESSAGES) as ChatMessage[];
        if (restored.some((message) => message.content.trim())) {
          const navigation = performance.getEntriesByType("navigation")[0] as
            | PerformanceNavigationTiming
            | undefined;
          const isReload = navigation?.type === "reload";
          const lastBoundaryIndex = restored.reduce(
            (lastIndex, message, index) =>
              message.sessionBoundary ? index : lastIndex,
            -1,
          );
          const hasConversationSinceBoundary = restored
            .slice(lastBoundaryIndex + 1)
            .some(
              (message) => !message.sessionBoundary && message.content.trim(),
            );

          setMessages(
            isReload && hasConversationSinceBoundary
              ? [
                  ...restored,
                  {
                    id: makeId(),
                    role: "assistant",
                    content: "",
                    sessionBoundary: true,
                    endedAt: Date.now(),
                  },
                ]
              : restored,
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
        CHAT_PREFERENCES_KEY,
        JSON.stringify(preferences),
      );
      if (!preferences.rememberHistory) {
        window.localStorage.removeItem(CHAT_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES)),
      );
    } catch {
      // Ignore browser quota or privacy-mode storage failures.
    }
  }, [messages, localMemoryReady, preferences]);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node || !stickToBottom) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior:
        loading || window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
  }, [messages, visibleAnswer, loading, open, stickToBottom]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearTimeout(copyTimer.current);
    };
  }, []);

  const stopAnswer = () => {
    requestVersion.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;

    const partial = currentAnswerRef.current || visibleAnswer;

    if (partial.trim()) {
      setMessages((existing) => [
        ...existing,
        {
          id: currentRequestIdRef.current || makeId(),
          role: "assistant",
          content: partial,
          answerSource: activeAnswerSource,
          sources: currentSourcesRef.current,
          actions: currentActionsRef.current,
          requestId: currentRequestIdRef.current || undefined,
          interrupted: true,
        },
      ]);
    }

    currentAnswerRef.current = "";
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = "";

    setVisibleAnswer("");
    setActivityLabel("AIO is analyzing…");
    setLoading(false);
  };

  useEffect(() => {
    if (!savedConversation) return;
    setCustomerAction(null);
    requestVersion.current += 1;
    abortRef.current?.abort();
    conversationIdRef.current = savedConversation.id;
    setMessages(
      savedConversation.messages.map((m) => ({
        ...m,
        role: m.role === "assistant" ? "assistant" : "user",
      })),
    );
    setLoading(false);
    setVisibleAnswer("");
    setInput("");
    setError("");
    setRetryMessages(null);
    setSelectedContext("");
    setTranscriptOpen(false);
    setTicketStep("idle");
    currentAnswerRef.current = "";
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
  }, [savedConversation]);
  const togglePinnedAnswer = async (message: ChatMessage) => {
    if (!auth.currentUser) {
      setError("Sign in to pin answers to your account.");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/aio/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: conversationIdRef.current,
          messageId: message.id,
          pinned: !message.pinned,
        }),
      });
      if (!response.ok)
        throw Error("The answer is still being saved. Try again in a moment.");
      setMessages((previous) =>
        previous.map((m) =>
          m.id === message.id ? { ...m, pinned: !m.pinned } : m,
        ),
      );
      window.dispatchEvent(new Event("aio-workspace-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to pin answer.");
    }
  };

  const clearChatMemory = async () => {
    if (clearingMemory) return;
    setClearingMemory(true);
    requestVersion.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;

    await new Promise((resolve) => window.setTimeout(resolve, 250));

    currentAnswerRef.current = "";
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = "";
    conversationIdRef.current = makeId();
    setSelectedContext("");
    setRetryMessages(null);
    setMessages([]);
    setVisibleAnswer("");
    setInput("");
    setError("");
    setActivityLabel("AIO is analyzing…");
    setQuickIndex((previous) => {
      if (QUICK_QUESTIONS.length <= 1) return 0;
      let next = Math.floor(Math.random() * QUICK_QUESTIONS.length);
      if (next === previous) next = (next + 1) % QUICK_QUESTIONS.length;
      return next;
    });
    setLoading(false);
    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    setClearingMemory(false);
    setClearDialogOpen(false);
  };

  const ticketPrompt = (content: string): ChatMessage => ({
    id: makeId(),
    role: "assistant",
    content,
  });

  const beginTicketFlow = (baseMessages = messages) => {
    if(loading)return;
    setError('');setTicketStep('idle');setSettingsOpen(false);setTranscriptOpen(false);
    setMessages([...baseMessages,ticketPrompt('Complete your support request below. Verify your email in the code box, then review and confirm before it is sent.')]);
    setCustomerAction({kind:'support_create',key:makeId()});
  };

  const continueTicketFlow = async (
    value: string,
    baseMessages: ChatMessage[],
  ) => {
    const answer = value.trim();
    const askAgain = (content: string) =>
      setMessages([...baseMessages, ticketPrompt(content)]);

    if (ticketStep === "name") {
      if (answer.length < 2)
        return askAgain(
          "Please enter your full name so I can attach it to the ticket.",
        );
      setTicketDraft((draft) => ({ ...draft, name: answer }));
      setTicketStep("email");
      return askAgain(
        "What email address should the support team use for replies?",
      );
    }

    if (ticketStep === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer))
        return askAgain(
          "That email address does not look complete. Please enter a valid email address.",
        );
      setTicketDraft((draft) => ({ ...draft, email: answer }));
      setTicketStep("category");
      return askAgain(`Choose a category: ${TICKET_CATEGORIES.join(", ")}.`);
    }

    if (ticketStep === "category") {
      const category = TICKET_CATEGORIES.find(
        (item) => item.toLowerCase() === answer.toLowerCase(),
      );
      if (!category)
        return askAgain(
          `Please choose one of these categories: ${TICKET_CATEGORIES.join(", ")}.`,
        );
      setTicketDraft((draft) => ({ ...draft, category }));
      setTicketStep("subject");
      return askAgain("Give your request a short subject.");
    }

    if (ticketStep === "subject") {
      if (answer.length < 3)
        return askAgain(
          "Please enter a short subject with at least three characters.",
        );
      setTicketDraft((draft) => ({ ...draft, subject: answer }));
      setTicketStep("message");
      return askAgain(
        "Finally, describe what happened and what you need help with.",
      );
    }

    if (ticketStep === "confirm") {
      if (/^(cancel|no|stop)$/i.test(answer)) {
        setTicketStep("idle");
        setTicketDraft(EMPTY_TICKET);
        return askAgain(
          "Support-ticket creation cancelled. No ticket was created.",
        );
      }

      if (!/^(confirm|yes|submit|create)$/i.test(answer)) {
        return askAgain(
          "Type **Confirm** to create this support ticket, or **Cancel** to stop.",
        );
      }

      setTicketStep("creating");
      setLoading(true);

      try {
        const response = await fetch("/api/aio/support-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...ticketDraft, confirmed: true }),
        });
        const data = await response.json();

        if (!response.ok || !data?.success || !data?.ticketId) {
          throw new Error(
            data?.error || "AIO could not create the support ticket.",
          );
        }

        window.sessionStorage.setItem(
          "auronix-support-handoff",
          JSON.stringify({
            ticketId: data.ticketId,
            subject: ticketDraft.subject,
          }),
        );
        setMessages([
          ...baseMessages,
          ticketPrompt(
            `Your support ticket was created successfully. Reference: **${data.ticketId}**.\n\n[Open Support Chat](/support/chat)`,
          ),
        ]);
        setTicketStep("idle");
        setTicketDraft(EMPTY_TICKET);
      } catch (caught) {
        setTicketStep("confirm");
        askAgain(
          caught instanceof Error
            ? userFacingError(caught)
            : "AIO could not create the support ticket. Please try again.",
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    if (ticketStep !== "message") return;
    if (answer.length < 10) {
      return askAgain(
        "Please add a little more detail so the team can understand the issue.",
      );
    }

    const completedTicket = { ...ticketDraft, message: answer };
    setTicketDraft(completedTicket);
    setTicketStep("confirm");
    return askAgain(
      [
        "**Review this support ticket before submission:**",
        `- **Category:** ${completedTicket.category}`,
        `- **Subject:** ${completedTicket.subject}`,
        `- **Reply email:** ${completedTicket.email}`,
        "",
        "Type **Confirm** to create the ticket or **Cancel** to stop.",
      ].join("\n"),
    );
  };

  const submitTicketValue = (value: string) => {
    if (loading || ticketStep === "idle" || ticketStep === "creating") return;
    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: value,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    void continueTicketFlow(value, nextMessages);
  };

  const sendMessage = async (
    event?: FormEvent,
    directText?: string,
    historyOverride?: ChatMessage[],
  ) => {
    event?.preventDefault();
    const text = (directText ?? input).trim();
    if (!text || loading || abortRef.current) return;
    const history = historyOverride ?? messages;
    const nextMessages = [
      ...history,
      { id: makeId(), role: "user" as const, content: text },
    ];
    setError("");
    setRetryMessages(null);
    setInput("");
    setMessages(nextMessages);
    setStickToBottom(true);
    if (ticketStep !== "idle") {
      await continueTicketFlow(text, nextMessages);
      return;
    }
    if (TICKET_INTENT.test(text)) {
      beginTicketFlow(nextMessages);
      return;
    }
    setLoading(true);
    setActivityLabel("AIO is analyzing…");
    setActiveAnswerSource("general");
    setVisibleAnswer("");

    currentAnswerRef.current = "";
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = "";

    const controller = new AbortController();
    abortRef.current = controller;
    const version = ++requestVersion.current;
    const isCurrent = () =>
      requestVersion.current === version && !controller.signal.aborted;

    let streamedCustomerAction:CustomerActionKind|undefined;
    let streamedAnswer = "";
    let streamedSources: AioSource[] = [];
    let streamedActions: AioAction[] = [];
    let streamedRequestId = makeId();
    let streamedAnswerSource: "premade" | "auronix" | "general" = "general";
    let completed = false;
    let truncated = false;

    try {
      const token = auth.currentUser
        ? await auth.currentUser.getIdToken().catch(() => null)
        : null;

      const response = await fetch("/api/aio/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pathname,
          conversationId: conversationIdRef.current,
          requestId: streamedRequestId,
          messages: currentChatContext(nextMessages, preferences.useContext),
          preferences: {
            model: preferences.model,
            replyLength: preferences.followReplyDefaults
              ? undefined
              : preferences.replyLength,
            tone: preferences.followReplyDefaults
              ? undefined
              : preferences.tone,
            saveHistory: preferences.rememberHistory,
          },
          context: {
            selectedText: selectedContext || undefined,
            pageTitle:
              typeof document !== "undefined"
                ? document.title.slice(0, 240)
                : undefined,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = "Unable to get an AIO response.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") message = data.error;
        } catch {
          // The public error above is intentionally generic.
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("AIO streaming is unavailable in this browser.");
      }

      const handleEvent = (event: AioStreamEvent) => {
        if (event.type === "message_start") {
          streamedRequestId = event.requestId;
          currentRequestIdRef.current = event.requestId;
          return;
        }

        if (event.type === "status") {
          setActivityLabel(event.label);
          return;
        }

        if (event.type === "source") {
          if (
            !streamedSources.some((source) => source.id === event.source.id)
          ) {
            streamedSources = [...streamedSources, event.source];
            currentSourcesRef.current = streamedSources;
          }
          return;
        }

        if (event.type === "action") {
          if (
            !streamedActions.some((action) => action.id === event.action.id)
          ) {
            streamedActions = [...streamedActions, event.action];
            currentActionsRef.current = streamedActions;
          }
          return;
        }

        if (event.type === "token") {
          streamedAnswer += event.token;
          currentAnswerRef.current = streamedAnswer;
          setVisibleAnswer(streamedAnswer);
          return;
        }

        if (event.type === "message_complete") {
          completed = true;
          truncated = Boolean(event.truncated);
          streamedAnswerSource = event.answerSource;
          setActiveAnswerSource(event.answerSource);
          return;
        }

        if(event.type==='customer_action') {
          streamedCustomerAction=event.kind;
          setCustomerAction({kind:event.kind,seed:event.seed,key:makeId()});
          setSettingsOpen(false);setTranscriptOpen(false);
          return;
        }
        if (event.type === "error") {
          throw new Error(event.message);
        }
      };

      for await (const event of paceAioEvents(
        readAioStream(response.body),
        preferences.model,
        controller.signal,
      )) {
        if (!isCurrent()) return;
        handleEvent(event);
        if (event.type === "message_complete") break;
      }
      if (!isCurrent()) return;
      if (!completed)
        throw new Error(
          "The connection ended before the reply finished. Please retry.",
        );
      if (!streamedAnswer.trim()) {
        throw new Error("AIO returned an empty response.");
      }

      setMessages((existing) => [
        ...existing,
        {
          id: streamedRequestId,
          role: "assistant",
          content: streamedAnswer.trim(),
          truncated,
          customerAction:streamedCustomerAction,
          answerSource: streamedAnswerSource,
          sources: streamedSources,
          actions: streamedActions,
          requestId: streamedRequestId,
        },
      ]);

      window.setTimeout(
        () => window.dispatchEvent(new Event("aio-workspace-updated")),
        1000,
      );
      currentAnswerRef.current = "";
      currentSourcesRef.current = [];
      currentActionsRef.current = [];
      currentRequestIdRef.current = "";
      setVisibleAnswer("");
    } catch (caught) {
      if (!isCurrent()) {
        return;
      }

      if (streamedAnswer.trim()) {
        setMessages((existing) => [
          ...existing,
          {
            id: streamedRequestId,
            role: "assistant",
            content: streamedAnswer.trim(),
            answerSource: streamedAnswerSource,
            sources: streamedSources,
            actions: streamedActions,
            requestId: streamedRequestId,
            interrupted: true,
          },
        ]);
      }

      window.setTimeout(
        () => window.dispatchEvent(new Event("aio-workspace-updated")),
        1000,
      );
      currentAnswerRef.current = "";
      currentSourcesRef.current = [];
      currentActionsRef.current = [];
      currentRequestIdRef.current = "";
      setVisibleAnswer("");
      setRetryMessages(history);
      setError(
        caught instanceof Error
          ? userFacingError(caught)
          : "AIO is temporarily unable to respond.",
      );
    } finally {
      if (requestVersion.current === version) {
        setLoading(false);
        setActivityLabel("AIO is analyzing…");
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  };

  const startNewChat = () => {
    setCustomerAction(null);
    if (loading) return;
    abortRef.current?.abort();
    conversationIdRef.current = makeId();
    setSelectedContext("");
    setRetryMessages(null);
    currentAnswerRef.current = "";
    currentSourcesRef.current = [];
    currentActionsRef.current = [];
    currentRequestIdRef.current = "";
    setVisibleAnswer("");
    setError("");
    setTicketStep("idle");
    setTicketDraft(EMPTY_TICKET);
    setInput("");
    if (presentation === "page") {
      setMessages([]);
      window.dispatchEvent(new Event("aio-workspace-new"));
      return;
    }
    setMessages((existing) => {
      const boundary = existing.reduce(
        (last, message, index) => (message.sessionBoundary ? index : last),
        -1,
      );
      const hasConversation = existing
        .slice(boundary + 1)
        .some((message) => !message.sessionBoundary && message.content.trim());

      return hasConversation
        ? [
            ...existing,
            {
              id: makeId(),
              role: "assistant",
              content: "",
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
    rating: "helpful" | "not_helpful",
  ) => {
    if (!message.requestId || feedbackPending.current.has(message.id)) return;
    feedbackPending.current.add(message.id);
    try {
      const response = await fetch("/api/aio/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: message.requestId,
          conversationId: conversationIdRef.current,
          rating,
        }),
      });
      if (!response.ok) throw new Error();
      setFeedback((current) => ({ ...current, [message.id]: rating }));
    } catch {
      setError("Feedback could not be saved. You can try again.");
    } finally {
      feedbackPending.current.delete(message.id);
    }
  };
  const regenerateMessage = (messageIndex: number) => {
    if (loading) return;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].sessionBoundary) break;
      const m = messages[i];
      if (m.role === "user") {
        void sendMessage(undefined, m.content, messages.slice(0, i));
        return;
      }
    }
  };
  const askQuick = (question: string) => void sendMessage(undefined, question);
  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setError("Copy is unavailable. Select the reply text to copy it.");
    }
  };
  const emailTranscript = async (event: FormEvent) => {
    event.preventDefault();
    if (transcriptBusy) return;
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !transcriptSecurityToken) { setTranscriptNotice("Please complete the security check before requesting or verifying a code."); return; }
    setTranscriptBusy(true);
    setTranscriptNotice("");
    setTranscriptSent(false);
    try {
      const response = await fetch("/api/aio/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: transcriptEmail,
          turnstileToken: transcriptSecurityToken,
          challengeId: transcriptChallenge || undefined,
          code: transcriptChallenge
            ? normalizeVerificationCode(transcriptCode)
            : undefined,
          messages: messages
            .filter((m) => !m.sessionBoundary && m.content.trim())
            .slice(-100)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Unable to email the transcript.");
      if (result.challengeId) {
        setTranscriptChallenge(result.challengeId);
        setTranscriptCode("");
        setTranscriptNotice(
          result.queued
            ? "Your verification email is queued. We are retrying delivery; enter the code when it arrives."
            : "Check your inbox for a verification code. Enter it below to send this conversation.",
        );
      } else {
        setTranscriptSent(true);
        setTranscriptNotice(
          result.queued
            ? "Your transcript is queued. We will retry email delivery automatically."
            : "Transcript accepted by our mail service. Check your inbox and spam folder.",
        );
        setTranscriptChallenge("");
        setTranscriptCode("");
      }
    } catch (error) {
      setTranscriptNotice(
        userFacingError(error, "Unable to email the transcript. Please retry."),
      );
    } finally {
      setTranscriptBusy(false);
      setTranscriptSecurityToken("");
      setTranscriptSecurityReset(v => v + 1);
    }
  };
  const exportChat = () => {
    const text = messages
      .filter((m) => !m.sessionBoundary)
      .map((m) => `${m.role === "user" ? "You" : "AIO"}\n${m.content}`)
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "auronix-conversation.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const preference = <K extends keyof ChatPreferences>(
    key: K,
    value: ChatPreferences[K],
  ) =>
    setPreferences((current) => ({
      ...current,
      [key]: value,
      ...(key === "replyLength" || key === "tone"
        ? { followReplyDefaults: false }
        : {}),
    }));
  const scrollToLatest = () => {
    setStickToBottom(true);
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };
  return (
    <>
      <AnimatePresence>
        {!open && presentation !== "page" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            onClick={() => setOpen(true)}
            aria-label="Open Auronix AI chat"
            className="auronix-ai-launcher aio-launcher"
          >
            <AuronixMark />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={
              presentation === "page"
                ? false
                : { opacity: 0, y: 16, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 32 }
            }
            role={presentation === "page" ? "region" : "dialog"}
            aria-label="Auronix AI chat"
            className={`auronix-ai-window aio-window ${presentation === "page" ? "aio-page-window" : expanded ? "aio-expanded" : ""}`}
          >
            <header className="aio-header">
              <div className="aio-identity">
                <AuronixMark />
                <div>
                  <label className="aio-model-picker aio-header-model-picker">
                    <span className="sr-only">AIO model</span>
                    <select
                      aria-label="AIO model"
                      value={preferences.model}
                      disabled={loading}
                      onChange={(event) =>
                        preference(
                          "model",
                          normalizeAioModelId(event.target.value),
                        )
                      }
                    >
                      {AIO_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>
                    {
                      AIO_MODELS.find((model) => model.id === preferences.model)
                        ?.label
                    }
                  </small>
                </div>
              </div>
              <div className="aio-header-tools">
                {presentation !== "page" && !loading && (
                  <Link
                    className="aio-page-link"
                    href="/aio/chat"
                    title="Open full-page chat"
                    aria-label="Open full-page AIO chat"
                  >
                    <ExternalLink size={16} />
                  </Link>
                )}
                <button
                  type="button"
                  aria-label="Chat settings"
                  title="Chat settings"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={settingsOpen ? "is-active" : ""}
                >
                  <Settings2 size={17} />
                </button>
                {presentation !== "page" && (
                  <>
                    <button
                      type="button"
                      className="aio-expand-toggle"
                      aria-label={expanded ? "Minimize chat" : "Expand chat"}
                      title={expanded ? "Minimize" : "Expand"}
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? (
                        <Minimize2 size={17} />
                      ) : (
                        <Maximize2 size={17} />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Close Auronix AI chat"
                      title="Close chat"
                      onClick={() => setOpen(false)}
                    >
                      <X size={19} />
                    </button>
                  </>
                )}
              </div>
            </header>
            <div className="aio-toolbar">
              <button type="button" onClick={()=>{setCustomerAction({kind:null,key:makeId()});setSettingsOpen(false);setTranscriptOpen(false);}} aria-label="Open customer actions"><ShieldCheck size={14}/><span>Actions</span></button>
              <button
                type="button"
                onClick={() => {
                  startNewChat();
                  setSettingsOpen(false);
                }}
                disabled={loading}
                aria-label="Start a new AIO conversation"
              >
                <Plus size={14} />
                New chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  beginTicketFlow();
                }}
                disabled={loading || ticketStep !== "idle"}
                aria-label="Create a support ticket"
              >
                <Ticket size={14} />
                Support
              </button>
              <div />
              <button
                type="button"
                aria-label="Email conversation"
                title="Email conversation"
                disabled={
                  loading ||
                  !messages.some((m) => !m.sessionBoundary && m.content.trim())
                }
                onClick={() => {
                  if (!transcriptOpen && transcriptSent) {
                    setTranscriptSent(false);
                    setTranscriptNotice("");
                  }
                  setTranscriptOpen(!transcriptOpen);
                  setSettingsOpen(false);
                }}
              >
                <Mail size={14} />
              </button>
              <button
                type="button"
                onClick={exportChat}
                disabled={!messages.some((m) => !m.sessionBoundary)}
                aria-label="Download conversation"
                title="Download conversation"
              >
                <Download size={14} />
              </button>
              <button
                type="button"
                onClick={() => setClearDialogOpen(true)}
                disabled={clearingMemory || ticketStep === "creating"}
                aria-label="Clear saved AI chat memory"
                title="Clear chat history"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {!customerAction && transcriptOpen && (
              <form
                className="aio-transcript-form"
                onSubmit={emailTranscript}
                aria-label="Email conversation transcript"
              >
                <div className="aio-transcript-fields">
                  <div className="aio-transcript-heading">
                    <Mail size={22} />
                    <h2>
                      {transcriptSent
                        ? "Transcript requested"
                        : "Email your conversation"}
                    </h2>
                  </div>
                  <p>
                    Get a copy of the messages visible in this chat. This does
                    not subscribe you to marketing.
                  </p>
                  {!transcriptSent && (
                    <>
                      <label>
                        Email address
                        <input
                          type="email"
                          autoComplete="email"
                          required
                          maxLength={254}
                          value={transcriptEmail}
                          disabled={transcriptBusy || !!transcriptChallenge}
                          onChange={(e) => setTranscriptEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </label>
                      {transcriptChallenge && (
                        <label>
                          Six-digit verification code
                          <input
                            autoFocus
                            required
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength={32}
                            value={transcriptCode}
                            disabled={transcriptBusy}
                            onChange={(e) =>
                              setTranscriptCode(
                                normalizeVerificationCode(e.target.value).slice(
                                  0,
                                  6,
                                ),
                              )
                            }
                            placeholder="123456"
                          />
                        </label>
                      )}
                      {transcriptChallenge && (
                        <p>
                          Use the code in the most recent transcript
                          verification email. It expires after 10 minutes.
                        </p>
                      )}
                      {transcriptChallenge && (
                        <button
                          className="aio-transcript-restart"
                          type="button"
                          disabled={transcriptBusy}
                          onClick={() => {
                            setTranscriptChallenge("");
                            setTranscriptCode("");
                            setTranscriptNotice("");
                          }}
                        >
                          Change email or request a new code
                        </button>
                      )}
                    </>
                  )}
                  {!transcriptSent && <CustomerActionSecurity onToken={setTranscriptSecurityToken} resetKey={transcriptSecurityReset}/>}
                  <p role="status" aria-live="polite">
                    {transcriptNotice}
                  </p>
                </div>
                <div className="aio-transcript-actions">
                  {!transcriptSent && (
                    <button
                      className="ax-btn"
                      type="submit"
                      disabled={transcriptBusy || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !transcriptSecurityToken)}
                    >
                      {transcriptBusy
                        ? "Please wait…"
                        : transcriptChallenge
                          ? "Confirm and send transcript"
                          : "Send verification code"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={transcriptBusy}
                    onClick={() => setTranscriptOpen(false)}
                  >
                    {transcriptSent ? "Back to chat" : "Cancel"}
                  </button>
                </div>
              </form>
            )}
            {customerAction ? <CustomerActionPanel key={customerAction.key} selection={customerAction} conversation={messages.map(m=>({role:m.role,content:m.content}))} conversationId={conversationIdRef.current} saveHistory={preferences.rememberHistory} onClose={()=>setCustomerAction(null)} onReceipt={result=>{setMessages(previous=>[...previous,{id:makeId(),role:'assistant',content:result.summary+(result.reference?`\nReference: ${result.reference}`:''),answerSource:'auronix'}]);window.dispatchEvent(new Event('aio-workspace-updated'));}}/> : transcriptOpen ? null : settingsOpen ? (
              <section className="aio-settings" aria-label="Chat preferences">
                <div className="aio-settings-heading">
                  <span>MAKE IT WORK FOR YOU</span>
                  <h2>Chat preferences</h2>
                  <p>Changes apply to your next message.</p>
                  <button
                    type="button"
                    className="aio-reset-defaults"
                    disabled={preferences.followReplyDefaults}
                    onClick={() => preference("followReplyDefaults", true)}
                  >
                    {preferences.followReplyDefaults
                      ? "Using Auronix reply defaults"
                      : "Use Auronix reply defaults"}
                  </button>
                </div>
                <div className="aio-model-description">
                  <strong>
                    {
                      AIO_MODELS.find((model) => model.id === preferences.model)
                        ?.name
                    }
                  </strong>
                  <p>
                    {
                      AIO_MODELS.find((model) => model.id === preferences.model)
                        ?.description
                    }
                  </p>
                  <a href="/aio">Explore AIO 2 →</a>
                </div>
                <fieldset>
                  <legend>Reply length</legend>
                  <div className="aio-choice-group">
                    {(["adaptive", "brief", "detailed"] as const).map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={
                            !preferences.followReplyDefaults &&
                            preferences.replyLength === value
                          }
                          onClick={() => preference("replyLength", value)}
                        >
                          {value === "adaptive"
                            ? "Adaptive"
                            : value === "brief"
                              ? "Brief"
                              : "Detailed"}
                        </button>
                      ),
                    )}
                  </div>
                  <p>Keep it short or ask for a fuller explanation.</p>
                </fieldset>
                <fieldset>
                  <legend>Tone</legend>
                  <div className="aio-choice-group">
                    {(["professional", "friendly", "direct"] as const).map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={
                            !preferences.followReplyDefaults &&
                            preferences.tone === value
                          }
                          onClick={() => preference("tone", value)}
                        >
                          {value[0].toUpperCase() + value.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                {(
                  [
                    {
                      key: "useContext",
                      title: "Use conversation context",
                      text: "Keep your current conversation in mind.",
                    },
                    {
                      key: "showSources",
                      title: "Show supporting sources",
                      text: "Display retrieved Auronix references.",
                    },
                    {
                      key: "enterToSend",
                      title: "Enter to send",
                      text: "Use Shift + Enter for a new line.",
                    },
                    {
                      key: "rememberHistory",
                      title: "Remember this chat",
                      text: "Save locally in this browser. Signed-in turns may also be saved to your account.",
                    },
                  ] as const
                ).map(({ key, title, text }) => (
                  <div className="aio-setting-row" key={key}>
                    <div>
                      <strong id={`aio-setting-${key}`}>{title}</strong>
                      <p>{text}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences[key]}
                      aria-labelledby={`aio-setting-${key}`}
                      onClick={() => preference(key, !preferences[key])}
                    >
                      <span />
                    </button>
                  </div>
                ))}
                <div className="aio-privacy-note">
                  <ShieldCheck size={17} />
                  <p>
                    Turning memory off removes the saved browser transcript and
                    stops future account-history saves. Earlier account history
                    remains separate. Never share passwords or verification
                    codes.
                  </p>
                </div>
                <button
                  type="button"
                  className="aio-settings-done"
                  onClick={() => setSettingsOpen(false)}
                >
                  Back to conversation <ArrowRight size={15} />
                </button>
              </section>
            ) : (
              <>
                <div
                  className="aio-messages"
                  ref={scrollRef}
                  onScroll={(event) => {
                    const el = event.currentTarget;
                    setStickToBottom(
                      el.scrollHeight - el.scrollTop - el.clientHeight < 100,
                    );
                  }}
                >
                  {!messages.length && !visibleAnswer && !error && (
                    <div className="aio-welcome">
                      <span className="aio-welcome-mark">
                        <AuronixMark />
                      </span>
                      <span className="aio-eyebrow">
                        A LITTLE CLARITY GOES A LONG WAY
                      </span>
                      <h2>
                        What can I help
                        <br />
                        you with today?
                      </h2>
                      <p>
                        Explore Auronix, understand your next step, or get help
                        with a partnership.
                      </p>
                      <div className="aio-starters">
                        {[
                          {
                            title: "Become a supplier",
                            text: "Explore the partnership process",
                            prompt: "How can I become an Auronix supplier?",
                          },
                          {
                            title: "Track an application",
                            text: "Find your next step",
                            prompt: "How do I track my seller application?",
                          },
                          {
                            title: "Get support",
                            text: "Solve an account or website issue",
                            prompt:
                              "How can I get help with my Auronix account?",
                          },
                        ].map((x) => (
                          <button
                            type="button"
                            key={x.title}
                            onClick={() => askQuick(x.prompt)}
                          >
                            <span>
                              <strong>{x.title}</strong>
                              <small>{x.text}</small>
                            </span>
                            <ArrowRight size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="aio-message-list">
                    {messages.map((message, index) => {
                      if (message.sessionBoundary)
                        return (
                          <div
                            key={message.id}
                            role="separator"
                            aria-label="Previous chat ended"
                            className="aio-boundary"
                          >
                            <span />
                            Previous chat ended · New chat
                            <span />
                          </div>
                        );
                      return (
                        <article
                          key={message.id}
                          className={`aio-message aio-${message.role}`}
                        >
                          <div className="aio-message-label">
                            {message.role === "assistant" ? (
                              <>
                                <AuronixMark />
                                <strong>AIO</strong>
                              </>
                            ) : (
                              <strong>You</strong>
                            )}
                          </div>
                          <div className="aio-message-body">
                            {message.role === "assistant" ? (
                              <>
                                <AIMessageContent content={message.content} />
                                {message.interrupted && (
                                  <p className="aio-interrupted">
                                    Reply stopped before it finished.
                                  </p>
                                )}
                                {message.truncated && (
                                  <button
                                    className="aio-continue"
                                    type="button"
                                    disabled={loading}
                                    onClick={() => askQuick("Continue")}
                                  >
                                    Continue reply <ArrowRight size={13} />
                                  </button>
                                )}
                                {preferences.showSources && (
                                  <AioMessageSources
                                    sources={message.sources || []}
                                  />
                                )}
                                <AioMessageActions
                                  actions={message.actions || []}
                                  onNavigate={(href) => router.push(href)}
                                />
                                {message.customerAction && isCustomerActionKind(message.customerAction) && <button className="aio-customer-action-link" type="button" onClick={()=>setCustomerAction({kind:message.customerAction!,key:makeId()})}>{CUSTOMER_ACTIONS[message.customerAction].title}<ArrowRight size={14}/></button>}
                                <div className="aio-message-tools">
                                  <MessageUtilityButton
                                    label={
                                      message.pinned
                                        ? "Unpin answer"
                                        : "Pin answer"
                                    }
                                    pressed={message.pinned}
                                    onClick={() =>
                                      void togglePinnedAnswer(message)
                                    }
                                  >
                                    <span aria-hidden="true">
                                      {message.pinned ? "★" : "☆"}
                                    </span>
                                  </MessageUtilityButton>
                                  <MessageUtilityButton
                                    label={
                                      copiedId === message.id
                                        ? "Copied"
                                        : "Copy"
                                    }
                                    onClick={() => void copyMessage(message)}
                                  >
                                    {copiedId === message.id ? (
                                      <Check size={14} />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                  </MessageUtilityButton>
                                  {message.requestId && (
                                    <>
                                      <MessageUtilityButton
                                        label="Regenerate"
                                        disabled={loading}
                                        onClick={() => regenerateMessage(index)}
                                      >
                                        <RefreshCw size={14} />
                                      </MessageUtilityButton>

                                      <MessageUtilityButton
                                        label="Helpful"
                                        pressed={
                                          feedback[message.id] === "helpful"
                                        }
                                        onClick={() =>
                                          void submitFeedback(
                                            message,
                                            "helpful",
                                          )
                                        }
                                      >
                                        <ThumbsUp size={14} />
                                      </MessageUtilityButton>
                                      <MessageUtilityButton
                                        label="Not helpful"
                                        pressed={
                                          feedback[message.id] === "not_helpful"
                                        }
                                        onClick={() =>
                                          void submitFeedback(
                                            message,
                                            "not_helpful",
                                          )
                                        }
                                      >
                                        <ThumbsDown size={14} />
                                      </MessageUtilityButton>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="aio-user-text">
                                {message.content}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {loading && (
                      <article className="aio-message aio-assistant">
                        <div className="aio-message-label">
                          <AuronixMark />
                          <strong>AIO</strong>
                        </div>
                        <div className="aio-message-body">
                          {visibleAnswer ? (
                            <div className="aio-streaming">
                              <AIMessageContent content={visibleAnswer} />
                              <span className="aio-stream-cursor" />
                            </div>
                          ) : (
                            <div className="aio-thinking" role="status">
                              <span>
                                <i />
                                <i />
                                <i />
                              </span>
                              {activityLabel}
                            </div>
                          )}
                        </div>
                      </article>
                    )}
                    {error && (
                      <div className="aio-error" role="alert">
                        <p>{error}</p>
                        {retryMessages && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              const last = [...messages]
                                .reverse()
                                .find((m) => m.role === "user");
                              if (last)
                                void sendMessage(
                                  undefined,
                                  last.content,
                                  retryMessages,
                                );
                            }}
                          >
                            <RefreshCw size={13} />
                            Try again
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {ticketStep === "category" && (
                    <div
                      className="aio-ticket-choices"
                      aria-label="Ticket categories"
                    >
                      {TICKET_CATEGORIES.map((category) => (
                        <button
                          type="button"
                          key={category}
                          onClick={() => submitTicketValue(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                  {ticketStep === "confirm" && (
                    <div
                      className="aio-ticket-choices"
                      aria-label="Confirm support ticket"
                    >
                      <button
                        type="button"
                        onClick={() => submitTicketValue("Confirm")}
                      >
                        Confirm & create
                      </button>
                      <button
                        type="button"
                        onClick={() => submitTicketValue("Cancel")}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {ticketStep !== "idle" && ticketStep !== "creating" && (
                    <button
                      type="button"
                      className="aio-cancel-ticket"
                      onClick={() => {
                        setTicketStep("idle");
                        setTicketDraft(EMPTY_TICKET);
                        setMessages((existing) => [
                          ...existing,
                          ticketPrompt(
                            "Ticket creation cancelled. No ticket was created.",
                          ),
                        ]);
                      }}
                    >
                      Cancel ticket creation
                    </button>
                  )}
                </div>
                {!stickToBottom && (
                  <button
                    type="button"
                    className="aio-jump"
                    aria-label="Jump to latest message"
                    onClick={scrollToLatest}
                  >
                    <ArrowDown size={15} />
                    Latest reply
                  </button>
                )}
                <div className="aio-composer-area">
                  {quickQuestion &&
                    messages.length > 0 &&
                    !loading &&
                    ticketStep === "idle" && (
                      <button
                        type="button"
                        className="aio-quick"
                        onClick={() => askQuick(quickQuestion)}
                      >
                        <AuronixMark className="aio-inline-mark" />
                        <span>{quickQuestion}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  <form
                    data-auronix-ai-form
                    onSubmit={sendMessage}
                    className="aio-composer"
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => {
                        setInput(event.target.value);
                        event.target.style.height = "auto";
                        event.target.style.height = `${Math.min(event.target.scrollHeight, 136)}px`;
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          preferences.enterToSend &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      aria-label="Your message"
                      maxLength={5000}
                      rows={1}
                      disabled={loading}
                      placeholder={
                        ticketStep === "idle"
                          ? "Ask AIO anything about Auronix…"
                          : "Your reply…"
                      }
                    />
                    {loading ? (
                      <button
                        type="button"
                        disabled={ticketStep === "creating"}
                        onClick={stopAnswer}
                        aria-label={
                          ticketStep === "creating"
                            ? "Creating support ticket"
                            : "Stop AI response"
                        }
                      >
                        {ticketStep === "creating" ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Square size={15} fill="currentColor" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        aria-label="Send message"
                      >
                        <Send size={17} />
                      </button>
                    )}
                  </form>
                  <div className="aio-composer-footer">
                    <span>AIO can make mistakes. Check important details.</span>
                    <button type="button" onClick={() => setSettingsOpen(true)}>
                      {preferences.followReplyDefaults
                        ? "Auronix default"
                        : preferences.replyLength === "adaptive"
                          ? "Adaptive"
                          : preferences.replyLength === "brief"
                            ? "Brief replies"
                            : "Detailed replies"}
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AlertDialog
        open={clearDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!clearingMemory) setClearDialogOpen(nextOpen);
        }}
      >
        <AlertDialogContent className="max-w-[min(92vw,420px)] rounded-[26px] border-border bg-background p-6 shadow-[0_28px_100px_rgba(0,0,0,0.34)]">
          <AlertDialogHeader className="text-left">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight">
              Delete this chat history?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm leading-6 text-foreground-muted">
              This removes the saved Auronix AI conversation from this browser.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={clearingMemory}
              className="h-11 rounded-xl border-border bg-secondary/60 px-5 font-sans font-semibold"
            >
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
              {clearingMemory ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {clearingMemory ? "Clearing chat…" : "Delete chat history"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export default AIChat;
function safeChatHref(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {}
  return undefined;
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
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((source) => {
            const href = safeChatHref(source.route || source.url);
            return (
              <div
                key={source.id}
                className="rounded-xl border border-border bg-secondary/35 p-3"
              >
                <div className="text-xs font-semibold">{source.title}</div>
                {source.excerpt && (
                  <div className="mt-1 line-clamp-3 text-[11px] leading-5 text-foreground-muted">
                    {source.excerpt}
                  </div>
                )}
                {href && (
                  <a
                    href={href}
                    target={source.url ? "_blank" : undefined}
                    rel={source.url ? "noopener noreferrer" : undefined}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
                  >
                    Open source
                    {source.url ? (
                      <ExternalLink className="h-3 w-3" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
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
      {actions
        .filter((action) => Boolean(safeChatHref(action.href)))
        .map((action) => (
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
  disabled,
  pressed,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] transition hover:bg-secondary hover:text-foreground"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
