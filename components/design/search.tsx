"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PUBLIC_PAGES } from "@/lib/design/navigation";
import { SOLUTIONS } from "@/lib/constants";
import { DEFAULT_FAQS, TROUBLESHOOTING_ARTICLES } from "@/lib/help-content";
import { getList } from "@/lib/firebase-db";
import type { FAQ } from "@/lib/types";
import { SegmentedControl } from "./primitives";
import pageContent from "@/lib/design/public-search.json";
type Result = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
};
const initial: Result[] = [
  ...TROUBLESHOOTING_ARTICLES.map((a) => ({
    id: `help-${a.slug}`,
    title: a.title,
    description:
      a.summary +
      " " +
      a.sections.map((s) => Object.values(s).flat().join(" ")).join(" "),
    href: `/help/${a.slug}`,
    category: "Answers",
  })),
  ...PUBLIC_PAGES.map((p) => ({
    id: p.path,
    title: p.title,
    description: (pageContent as Record<string, string>)[p.path] || p.category,
    href: p.path,
    category: p.category === "Legal" ? "Policies" : "Pages",
  })),
  ...SOLUTIONS.map((s, i) => ({
    id: `service-${i}`,
    title: s.title,
    description: s.description,
    href: `/solutions#solution-${i}`,
    category: "Services",
  })),
  ...DEFAULT_FAQS.map((f) => ({
    id: `faq-${f.id}`,
    title: f.question,
    description: f.answer,
    href: `/faq#faq-${f.id}`,
    category: "Answers",
  })),
];
export function fuzzyScore(text: string, query: string) {
  const t = text.toLowerCase(),
    q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t.includes(q)) return 3;
  const terms = q.split(/\s+/);
  if (terms.every((v) => t.includes(v))) return 2;
  let index = 0;
  for (const c of t) {
    if (c === q[index]) index++;
    if (index === q.length) return q.length > 2 ? 0.5 : 0;
  }
  return 0;
}
export function CommandPalette() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [managed, setManaged] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const show = () => setOpen(true);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("auronix:search", show);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("auronix:search", show);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (!open || loaded) return;
    let live = true;
    getList<FAQ>("faqs", "order")
      .then((data) => {
        if (live) {
          setManaged(
            data
              .filter((f) => f.active !== false)
              .map((f) => ({
                id: `managed-${f.id}`,
                title: f.question,
                description: f.answer,
                href: `/faq#faq-${f.id}`,
                category: "Answers",
              })),
          );
          setLoaded(true);
        }
      })
      .catch(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [open, loaded]);
  const results = useMemo(
    () =>
      [...initial, ...managed]
        .filter((r) => category === "All" || r.category === category)
        .map((r) => ({
          r,
          score:
            fuzzyScore(r.title, query) +
            (query &&
            query
              .toLowerCase()
              .split(/\s+/)
              .every((term) => r.description.toLowerCase().includes(term))
              ? 1
              : 0) +
            (query && r.title.toLowerCase().includes(query.toLowerCase())
              ? 4
              : 0),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 40)
        .map((x) => x.r),
    [query, category, managed],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery("");
          setCategory("All");
        }
      }}
    >
      <DialogContent
        className="ac-command"
        aria-describedby="command-description"
      >
        <DialogTitle className="sr-only">Auronix Command Center</DialogTitle>
        <DialogDescription id="command-description" className="sr-only">
          Search pages, services, answers and policies. Use arrow keys to choose
          a result and Enter to open it.
        </DialogDescription>
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder="Where would you like to go?"
            value={query}
            onValueChange={setQuery}
          />
          <SegmentedControl
            label="Search category"
            options={["All", "Pages", "Services", "Answers", "Policies"]}
            value={category}
            onChange={setCategory}
          />
          <CommandList>
            <CommandEmpty>No results. Try a shorter search.</CommandEmpty>
            <CommandGroup
              heading={query ? "Search results" : "Explore Auronix"}
            >
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.id}
                  onSelect={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(r.href);
                  }}
                >
                  <div>
                    <span className="ac-result-meta">{r.category}</span>
                    <strong>{r.title}</strong>
                    <p>
                      {r.description.slice(0, 180)}
                      {r.description.length > 180 ? "…" : ""}
                    </p>
                  </div>
                  <ArrowUpRight size={18} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="ac-command-footer">
            <span>↑ ↓ Navigate</span>
            <span>
              <CornerDownLeft size={13} /> Open
            </span>
            <span>Esc Close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
