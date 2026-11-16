"use client";
import Link from "next/link";
import { DeveloperLogo } from "@/components/developers/brand";
import { isDeveloperTopic } from "@/lib/aio/developer-brand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function AIMessageContent({ content, developerContext = false }: { content: string; developerContext?: boolean }) {
  return (
    <div className="aio-markdown">
      {(developerContext || isDeveloperTopic(content)) && <Link className="aio-developer-reply-brand" href="/aio/developers" aria-label="Explore AIO for developers"><DeveloperLogo /><span>Developer platform · Explore →</span></Link>}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="aio-table-wrap">
              <table>{children}</table>
            </div>
          ),
          pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
