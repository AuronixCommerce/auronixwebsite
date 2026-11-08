"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function AIMessageContent({ content }: { content: string }) {
  return (
    <div className="aio-markdown">
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
