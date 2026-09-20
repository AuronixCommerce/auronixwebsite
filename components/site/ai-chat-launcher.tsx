'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Bot } from 'lucide-react';
import { AuronixMark } from '@/components/site/auronix-mark';

const DeferredAIChat = dynamic(
  () => import('@/components/site/ai-chat').then((module) => module.AIChat),
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
  }
);

export function AIChatLauncher() {
  const [active, setActive] = useState(false);

  if (active) {
    return <DeferredAIChat initiallyOpen />;
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label="Open Auronix AI chat"
      className="auronix-ai-launcher flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 text-primary-foreground shadow-[0_14px_42px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95"
    >
      <span className="absolute inset-1 rounded-full bg-white/15" />
      <span className="relative inline-flex h-10 w-10 shrink-0">
        <AuronixMark className="h-full w-full shadow-none" />
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-accent text-white shadow-sm">
          <Bot className="h-2.5 w-2.5" />
        </span>
      </span>
    </button>
  );
}
