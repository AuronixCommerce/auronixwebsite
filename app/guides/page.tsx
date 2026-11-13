"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/section";
const guides = [
  {
    title: "Become an Auronix supplier",
    category: "Suppliers",
    type: "Video · 1 min",
    description:
      "Company details, supporting documents, supply terms, and submission.",
    href: "/supplier#supplier-video",
  },
  {
    title: "Meet Auronix and AIO",
    category: "AIO",
    type: "Video · 2 min",
    description:
      "Modes, customer actions, verification, saved chats, and next steps.",
    href: "/guide#watch-overview",
  },
  {
    title: "Track your supplier application",
    category: "Applications",
    type: "Interactive guide",
    description:
      "Verify your email to see progress, review messages, and upload requested documents.",
    href: "/supplier/track",
  },
  {
    title: "Account and email help",
    category: "Accounts",
    type: "Written guides · PDF downloads",
    description:
      "Guides for login, email verification, invitation links, and recovery.",
    href: "/help",
  },
  {
    title: "Save and resume a supplier draft",
    category: "Applications",
    type: "Interactive guide",
    description:
      "Complete your checklist and save an email-verified draft securely.",
    href: "/supplier#supplier-draft",
  },
];
export default function Page() {
  const [category, setCategory] = useState("All"),
    [query, setQuery] = useState("");
  return (
    <>
      <PageHeader
        eyebrow="THE GUIDE LIBRARY"
        title={
          <>
            A little guidance.
            <br />A clear next step.
          </>
        }
        description="Watch a walkthrough or open a practical guide for suppliers, accounts, applications, and AIO."
      />
      <Section>
        <div className="op-guide-filters">
          <label>
            Search guides
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Applications, AIO, email…"
            />
          </label>
          <div className="op-tabs" role="tablist" aria-label="Guide categories">
            {["All", "Suppliers", "Accounts", "Applications", "AIO"].map(
              (c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="op-guide-grid">
          {guides
            .filter(
              (g) =>
                (category === "All" || g.category === category) &&
                (g.title + " " + g.description)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((g) => (
              <article className="op-card" key={g.title}>
                {g.type.startsWith("Video") ? (
                  <PlayCircle size={28} />
                ) : (
                  <BookOpen size={28} />
                )}
                <span className="op-kicker">
                  {g.category} · {g.type}
                </span>
                <h2>{g.title}</h2>
                <p>{g.description}</p>
                <Link className="op-link" href={g.href}>
                  Open guide
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
        </div>
      </Section>
    </>
  );
}
