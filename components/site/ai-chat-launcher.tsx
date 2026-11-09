"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuronixMark } from "@/components/site/auronix-mark";
import {
  AIO_SELECTION_EVENT,
  type AioSelectionRequest,
} from "@/lib/aio-selection";

const DeferredAIChat = dynamic(
  () => import("@/components/site/ai-chat").then((module) => module.AIChat),
  {
    ssr: false,
    loading: () => (
      <div
        className="auronix-ai-launcher flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-primary-foreground shadow-[0_14px_42px_rgba(0,0,0,0.22)]"
        role="status"
        aria-label="Opening Auronix AI chat"
      >
        <span className="h-5 w-5 animate-pulse rounded-full border-2 border-white/35 border-t-white" />
      </div>
    ),
  },
);

export function AIChatLauncher() {
  const [active, setActive] = useState(false);
  const [selectionRequest, setSelectionRequest] =
    useState<AioSelectionRequest | null>(null);

  useEffect(() => {
    const openWithSelection = (event: Event) => {
      const request = (event as CustomEvent<AioSelectionRequest>).detail;

      if (!request?.prompt) {
        return;
      }

      setSelectionRequest(request);
      setActive(true);
    };

    window.addEventListener(AIO_SELECTION_EVENT, openWithSelection);

    return () =>
      window.removeEventListener(AIO_SELECTION_EVENT, openWithSelection);
  }, []);

  if (active) {
    return <DeferredAIChat initiallyOpen selectionRequest={selectionRequest} />;
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label="Open Auronix AI chat"
      className="auronix-ai-launcher aio-launcher"
    >
      <AuronixMark />
    </button>
  );
}
