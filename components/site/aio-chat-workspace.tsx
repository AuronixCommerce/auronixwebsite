"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  LifeBuoy,
  Store,
} from "lucide-react";
import { AIChat } from "./ai-chat";
import { SavedChatList } from "./saved-chat-list";
import { AuronixMark } from "./auronix-mark";
import { ThemeToggle } from "./theme-toggle";
import { SelectionActions } from "./selection-actions";
import { SearchField, SearchHost } from "@/components/design/search-trigger";
import {
  AIO_SELECTION_EVENT,
  type AioSelectionRequest,
} from "@/lib/aio-selection";
export function AioChatWorkspace() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedConversation, setSavedConversation] = useState<{
    id: string;
    messages: any[];
  } | null>(null);
  const [selectionRequest, setSelectionRequest] =
    useState<AioSelectionRequest | null>(null);
  useEffect(() => {
    const select = (event: Event) => {
      const request = (event as CustomEvent<AioSelectionRequest>).detail;
      if (request?.prompt) setSelectionRequest(request);
    };
    window.addEventListener(AIO_SELECTION_EVENT, select);
    return () => window.removeEventListener(AIO_SELECTION_EVENT, select);
  }, []);
  return (
    <div className="aio-workspace">
      <a href="#main-content" className="ac-skip">
        Skip to chat
      </a>
      <aside
        data-history-open={historyOpen}
        className="aio-workspace-sidebar"
        aria-label="AIO workspace navigation"
      >
        <Link
          href="/aio"
          className="aio-workspace-brand"
          aria-label="About AIO"
        >
          <AuronixMark />
          <span>
            AIO<small>BY AURONIX</small>
          </span>
        </Link>
        <div className="aio-workspace-intro">
          <span>ROOM TO THINK</span>
          <h1>
            Your next step
            <br />
            starts here.
          </h1>
          <p>A little more space for questions, ideas, and clear answers.</p>
        </div>
        <button
          className="aio-workspace-mobile-toggle"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          History
        </button>
        <SavedChatList
          onOpen={(chat) => {
            setSavedConversation(chat);
            setHistoryOpen(false);
          }}
        />
        <SearchField label="Search Auronix" />
        <nav aria-label="Explore Auronix">
          <Link href="/aio">
            <BookOpen size={17} />
            Explore AIO
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/support">
            <LifeBuoy size={17} />
            Get human support
            <ArrowUpRight size={14} />
          </Link>
          <a href="https://shop.auronixcommerce.com/">
            <Store size={17} />
            Affiliate Shop
            <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="aio-workspace-bottom">
          <ThemeToggle showLabel />
          <Link href="/">
            <ArrowLeft size={15} />
            Back to Auronix
          </Link>
          <p>AI can make mistakes. Verify important details before acting.</p>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="aio-workspace-main">
        <AIChat
          savedConversation={savedConversation}
          initiallyOpen
          presentation="page"
          selectionRequest={selectionRequest}
        />
      </main>
      <SearchHost />
      <SelectionActions />
    </div>
  );
}
