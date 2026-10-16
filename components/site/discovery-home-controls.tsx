"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { openSearch } from "@/components/design/search-trigger";

const suggestions = ["supplier partnerships", "marketplace operations", "product sourcing", "application status"];

export function DiscoverySearch() {
  const [query, setQuery] = useState("");
  const [example, setExample] = useState(0);
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;
    const timer = window.setInterval(() => setExample((current) => (current + 1) % suggestions.length), 3600);
    return () => window.clearInterval(timer);
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openSearch(query);
  };
  return <form className="wc-search" role="search" onSubmit={submit}>
    <Search size={21} aria-hidden="true" />
    <label className="sr-only" htmlFor="wc-search-input">Search Auronix</label>
    <input id="wc-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search for ${suggestions[example]}`} />
    <button type="submit">Search <ArrowRight size={17} /></button>
  </form>;
}

const audiences = {
  suppliers: {
    eyebrow: "FOR SUPPLIERS",
    title: "Bring your products to the right channels.",
    text: "Auronix works with legitimate manufacturers, distributors, wholesalers, and brands. Share your catalog, commercial terms, and authorization documents through a structured application.",
    href: "/supplier",
    action: "Become a supplier",
    points: [
      { icon: ShieldCheck, title: "A considered review", text: "We assess fit, quality, documentation, and marketplace opportunity." },
      { icon: Store, title: "Marketplace expertise", text: "Our operations support product preparation, listings, and performance." },
      { icon: Truck, title: "A clear next step", text: "Track your application and work with the team from one place." },
    ],
  },
  partners: {
    eyebrow: "FOR PARTNERS",
    title: "A practical partner for modern commerce.",
    text: "We connect product opportunities with disciplined sourcing, procurement, distribution, and marketplace operations built for lasting relationships.",
    href: "/partners",
    action: "Explore partnerships",
    points: [
      { icon: ShieldCheck, title: "Verified business", text: "Auronix Commerce LLC is registered in Florida, United States." },
      { icon: Store, title: "Channel experience", text: "Our team focuses on the marketplaces where customers shop." },
      { icon: Truck, title: "Structured operations", text: "Every opportunity moves through a clear evaluation and launch process." },
    ],
  },
} as const;

export function AudienceSwitch() {
  const [active, setActive] = useState<keyof typeof audiences>("suppliers");
  const audience = audiences[active];
  return <div className="wc-audience">
    <div className="wc-audience-tabs" role="tablist" aria-label="Partnership type" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'suppliers' : event.key === 'End' ? 'partners' : active === 'suppliers' ? 'partners' : 'suppliers';
      setActive(next);
      event.currentTarget.querySelector<HTMLButtonElement>(`#wc-tab-${next}`)?.focus();
    }}>
      <button type="button" id="wc-tab-suppliers" role="tab" tabIndex={active === "suppliers" ? 0 : -1} aria-selected={active === "suppliers"} aria-controls="wc-audience-panel" onClick={() => setActive("suppliers")}>For suppliers</button>
      <button type="button" id="wc-tab-partners" role="tab" tabIndex={active === "partners" ? 0 : -1} aria-selected={active === "partners"} aria-controls="wc-audience-panel" onClick={() => setActive("partners")}>For partners</button>
    </div>
    <div id="wc-audience-panel" role="tabpanel" aria-labelledby={`wc-tab-${active}`} key={active} className="wc-audience-panel">
      <div className="wc-audience-copy"><span className="wc-overline">{audience.eyebrow}</span><h3>{audience.title}</h3><p>{audience.text}</p><Link href={audience.href} className="wc-primary-link">{audience.action} <ArrowRight size={18} /></Link></div>
      <div className="wc-audience-benefits">{audience.points.map(({ icon: Icon, title, text }) => <div key={title}><span><Icon size={21} /></span><div><h4>{title}</h4><p>{text}</p></div><ArrowRight size={16} /></div>)}</div>
    </div>
  </div>;
}
