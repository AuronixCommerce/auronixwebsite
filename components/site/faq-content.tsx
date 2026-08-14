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

export function FAQContent() {
  const [faqs, setFaqs] = useState<
    (FAQ & { id: string })[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

        setFaqs(
          data
            .filter(
              (faq) => faq.active !== false
            )
            .sort(
              (a, b) =>
                Number(a.order || 0) -
                Number(b.order || 0)
            )
        );
      } catch (error) {
        console.error(
          'Failed to load FAQs:',
          error
        );

        if (mounted) {
          setFaqs([]);
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

    if (!q) return faqs;

    return faqs.filter(
      (faq) =>
        faq.question
          ?.toLowerCase()
          .includes(q) ||
        faq.answer
          ?.toLowerCase()
          .includes(q) ||
        faq.category
          ?.toLowerCase()
          .includes(q)
    );
  }, [faqs, search]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          filteredFAQs
            .map((faq) => faq.category)
            .filter(Boolean)
        )
      ),
    [filteredFAQs]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />

        <input
          type="search"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search FAQs…"
          className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
        />
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
              );

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
