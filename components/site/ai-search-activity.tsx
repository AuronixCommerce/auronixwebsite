import { Check, ChevronDown, Search } from "lucide-react";
import { DeveloperLogo } from "@/components/developers/brand";
import { sourceActivityItems } from "@/lib/aio/source-activity";
import type { AioSource } from "@/lib/aio/types";

export function AISearchActivity({ sources, active = false }: { sources: AioSource[]; active?: boolean }) {
  const items = sourceActivityItems(sources);
  if (!items.length) return null;
  return <details className="aio-search-activity" open={active ? true : undefined}>
    <summary><Search size={13} aria-hidden="true" /><span>{active ? "Searching Auronix knowledge" : "Sources checked"}</span><ChevronDown size={13} aria-hidden="true" /></summary>
    <ul aria-label="Retrieved website sources">{items.map(item => <li key={item.key}>
      {active ? <span className="aio-search-pulse" aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
      <span className="aio-search-verb">{active ? "Searching" : "Checked"}</span>
      {item.developer ? <DeveloperLogo /> : <span className="aio-search-page">{item.title}</span>}
    </li>)}</ul>
  </details>;
}
