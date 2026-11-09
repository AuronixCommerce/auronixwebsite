"use client";
import { ArrowUpRight } from "lucide-react";
import { openAio } from "@/lib/aio-selection";
import type { AioModelId } from "@/lib/aio/models";
export function AioTryButton({
  model = "aio-2",
  children = "Try AIO 2",
}: {
  model?: AioModelId;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="ax-btn"
      onClick={() =>
        openAio("How can AIO help me use Auronix Commerce?", undefined, model)
      }
    >
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
