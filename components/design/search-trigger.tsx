"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
const LazyCommand = dynamic(
  () => import("./search").then((m) => m.CommandPalette),
  { ssr: false },
);
export function openSearch(query = "") {
  window.dispatchEvent(new CustomEvent("auronix:search", { detail: { query } }));
}
export function SearchField({
  className = "",
  label = "Search Auronix",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      className={`ac-search-field ${className}`}
    >
      <Search size={19} />
      <span>{label}</span>
      <kbd>⌘ K</kbd>
    </button>
  );
}
export const GlobalSearch = SearchField;
export function SearchHost() {
  const [activated, setActivated] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  useEffect(() => {
    const show = (event: Event) => {
      setInitialQuery((event as CustomEvent<{ query?: string }>).detail?.query || "");
      setActivated(true);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActivated(true);
      }
    };
    window.addEventListener("auronix:search", show);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("auronix:search", show);
      window.removeEventListener("keydown", key);
    };
  }, []);
  return activated ? <LazyCommand initialQuery={initialQuery} /> : null;
}
