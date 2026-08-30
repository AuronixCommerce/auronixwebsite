'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Search, UserRoundCog } from 'lucide-react';
import { TROUBLESHOOTING_ARTICLES } from '@/lib/help-content';

export function HelpCenterContent() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(TROUBLESHOOTING_ARTICLES.map((article) => article.category)))];
  const articles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return TROUBLESHOOTING_ARTICLES.filter((article) =>
      (category === 'All' || article.category === category) &&
      (!normalized || `${article.title} ${article.summary} ${article.category} ${article.audience}`.toLowerCase().includes(normalized))
    );
  }, [category, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
        <label className="relative block"><span className="sr-only">Search troubleshooting articles</span><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search login, verification, dashboard, catalogs…" className="h-14 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20" /></label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Troubleshooting categories">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${category === item ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground-muted hover:text-foreground'}`}>{item}</button>)}</div>
      </div>

      <div className="mt-8 flex items-center justify-between"><p className="text-sm text-foreground-muted" aria-live="polite">{articles.length} technical {articles.length === 1 ? 'guide' : 'guides'}</p><Link href="/faq" className="text-sm font-semibold text-accent hover:underline">Browse all FAQs</Link></div>

      {articles.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{articles.map((article) => <article key={article.slug} className="group flex min-h-72 flex-col rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">{article.category === 'Seller Dashboard' ? <UserRoundCog className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}</span><span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">{article.category}</span></div><h2 className="mt-6 text-xl font-semibold leading-tight">{article.title}</h2><p className="mt-3 flex-1 text-sm leading-6 text-foreground-muted">{article.summary}</p><div className="mt-6 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-foreground-muted">For {article.audience}</span><Link href={`/help/${article.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-accent">Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></div></article>)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-border p-14 text-center"><BookOpen className="mx-auto h-8 w-8 text-foreground-muted" /><h2 className="mt-4 font-semibold">No guide matches that search</h2><button type="button" onClick={() => { setQuery(''); setCategory('All'); }} className="mt-3 text-sm font-semibold text-accent">Clear filters</button></div>}
    </div>
  );
}
