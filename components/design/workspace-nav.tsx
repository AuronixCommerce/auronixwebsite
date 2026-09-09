"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, Search, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function WorkspaceNav({
  items,
  title,
}: {
  items: readonly { label: string; href: string }[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <>
      <button
        type="button"
        className="ac-search-field"
        aria-label={`Search ${title} pages`}
        onClick={() => setOpen(true)}
      >
        <Search size={17} />
        <span>Search {title}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose a workspace page.</DialogDescription>
          <input
            aria-label={`Filter ${title} pages`}
            placeholder="Search pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4"
          />
          <nav className="grid gap-1">
            {items
              .filter((i) =>
                i.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl p-3 hover:bg-secondary"
                >
                  {i.label}
                  <ArrowRight size={16} />
                </Link>
              ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
