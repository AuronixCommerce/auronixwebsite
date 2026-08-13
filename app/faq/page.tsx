'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/site/states';
import { subscribeToList } from '@/lib/firebase-db';
import type { FAQ } from '@/lib/types';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<(FAQ & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const unsubscribe = subscribeToList<FAQ>(
      'faqs',
      (data) => {
        const active = data
          .filter((f) => f.active)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setFaqs(active);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.category));
    return ['All', ...Array.from(cats)];
  }, [faqs]);

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const matchesCategory = activeCategory === 'All' || f.category === activeCategory;
      const matchesSearch =
        !search ||
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, search]);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="FAQ"
        title={<>Frequently asked questions.</>}
        description="Find answers to common questions about Auronix, our services, and how we work with partners."
      />

      <Section className="border-t border-border">
        <div className="max-w-3xl mx-auto">
          {/* Search */}
          <Reveal>
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                className="pl-11 h-12"
              />
            </div>
          </Reveal>

          {/* Category filters */}
          {categories.length > 1 && (
            <Reveal delay={0.05}>
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-foreground-muted hover:text-foreground hover:border-border-strong'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {/* Content */}
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? 'No results found.' : 'No FAQs available.'}
              description={
                search
                  ? 'Try a different search term or browse all questions.'
                  : 'FAQs will appear here once they are published.'
              }
            />
          ) : (
            <Reveal delay={0.1}>
              <Accordion type="single" collapsible className="space-y-3">
                {filtered.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="rounded-2xl border border-border bg-card px-6 data-[state=open]:shadow-premium transition-shadow"
                  >
                    <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground-muted leading-relaxed pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          )}
        </div>
      </Section>
    </SiteLayout>
  );
}
