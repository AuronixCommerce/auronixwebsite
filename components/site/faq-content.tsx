'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { getList } from '@/lib/firebase-db';
import type { FAQ } from '@/lib/types';
import { DEFAULT_FAQS, FAQ_CATEGORY_ORDER } from '@/lib/help-content';

export function FAQContent() {
  const [faqs, setFaqs] = useState<
    (FAQ & { id: string })[]
  >(DEFAULT_FAQS);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeId, setActiveId] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFAQs() {
      try {
        const data = await getList<FAQ>(
          'faqs',
          'order'
        );

        if (!mounted) return;

        const managed = data
            .filter(
              (faq) => faq.active !== false
            )
            .sort(
              (a, b) =>
                Number(a.order || 0) -
                Number(b.order || 0)
            )
        ;

        setFaqs([...DEFAULT_FAQS, ...managed]);
      } catch (error) {
        console.error(
          'Failed to load FAQs:',
          error
        );

        if (mounted) {
          setFaqs(DEFAULT_FAQS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFAQs();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredFAQs = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    const searchTerms = q.split(/\s+/).filter(Boolean);

    return faqs.filter((faq) => {
      if (selectedCategory !== 'All' && faq.category !== selectedCategory) {
        return false;
      }

      if (!searchTerms.length) return true;

      const searchableText = [faq.question, faq.answer, faq.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [faqs, search, selectedCategory]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          filteredFAQs
            .map((faq) => faq.category)
            .filter(Boolean)
        )
      ).sort((a, b) => {
        const aIndex = FAQ_CATEGORY_ORDER.indexOf(a as typeof FAQ_CATEGORY_ORDER[number]);
        const bIndex = FAQ_CATEGORY_ORDER.indexOf(b as typeof FAQ_CATEGORY_ORDER[number]);
        return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.localeCompare(b);
      }),
    [filteredFAQs]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />

        <input
          type="search"
          aria-label="Search frequently asked questions"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder={`Search ${faqs.length}+ answers…`}
          className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
        />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="FAQ categories">
          {['All', ...FAQ_CATEGORY_ORDER].map((category) => (
            <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground-muted hover:text-foreground'}`}>
              {category}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs text-foreground-muted" aria-live="polite">Showing {filteredFAQs.length} answers{selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      ) : filteredFAQs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <HelpCircle className="w-8 h-8 mx-auto text-foreground-muted" />

          <h2 className="mt-4 font-semibold">
            No FAQs found
          </h2>

          <p className="mt-2 text-sm text-foreground-muted">
            Try another search or contact our team.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((category) => {
            const categoryFAQs =
              filteredFAQs.filter(
                (faq) =>
                  faq.category === category
              ).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

            return (
              <section key={category}>
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                  {category}
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {categoryFAQs.map((faq) => {
                    const open =
                      activeId === faq.id;

                    return (
                      <div
                        key={faq.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveId(
                              open
                                ? null
                                : faq.id
                            )
                          }
                          className="w-full flex items-center gap-4 px-5 sm:px-6 py-5 text-left hover:bg-secondary/40 transition-colors"
                        >
                          <span className="flex-1 text-sm sm:text-base font-medium">
                            {faq.question}
                          </span>

                          <ChevronDown
                            className={`w-5 h-5 shrink-0 transition-transform ${
                              open
                                ? 'rotate-180'
                                : ''
                            }`}
                          />
                        </button>

                        {open && (
                          <div className="px-5 sm:px-6 pb-6">
                            <p className="text-sm sm:text-base text-foreground-muted leading-relaxed whitespace-pre-wrap">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
