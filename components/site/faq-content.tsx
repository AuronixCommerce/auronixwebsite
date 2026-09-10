'use client';
import { Spinner } from '@/components/design/primitives';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Search,
} from 'lucide-react';
import { getList } from '@/lib/firebase-db';
import type { FAQ } from '@/lib/types';
import { DEFAULT_FAQS, FAQ_CATEGORY_ORDER } from '@/lib/help-content';

const MOST_ASKED_QUESTIONS = [
  "What is Auronix Commerce LLC?",
  "Does Auronix Commerce operate an online retail store?",
  "Where can I verify company information?",
  "Where can I apply as a supplier?",
  "Is a supplier submission the same as a seller account?",
  "What should a supplier submission include?",
  "Does submitting as a supplier guarantee purchasing?",
  "How long does supplier review take?",
  "How do I become a business partner?",
  "Who can submit a seller application?",
  "What information should I prepare before applying?",
  "What happens after I submit the application?",
  "How will I know if my seller application is approved?",
  "Does Auronix guarantee marketplace approval?",
  "How do I contact Auronix Commerce?"
];

const MOST_ASKED_FAQS = MOST_ASKED_QUESTIONS.flatMap((question) => {
  const faq = DEFAULT_FAQS.find((item) => item.question === question);
  return faq ? [faq] : [];
});

export function FAQContent() {
  const [faqs, setFaqs] = useState<
    (FAQ & { id: string })[]
  >(DEFAULT_FAQS);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { const sync = () => {const id = decodeURIComponent(window.location.hash).replace(/^#faq-/, '');if(id) setActiveId(id);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);}, []);

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
    <div className="min-w-0 max-w-4xl mx-auto">
      <section aria-labelledby="most-asked-title" className="mb-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Start here</p>
            <h2 id="most-asked-title" className="mt-2 text-3xl font-semibold tracking-tight">Most Asked</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-foreground-muted">Get to know Auronix, explore supplier partnerships, and understand the application process.</p>
          </div>
          <a href="#all-faqs" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Browse all answers</a>
        </div>
        <div className="ac-content-panel overflow-hidden">
          {MOST_ASKED_FAQS.map((faq) => (
            <details key={faq.id} className="group border-b border-border last:border-b-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-5 text-left hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 break-words text-sm font-medium sm:text-base">{faq.question}</span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="whitespace-pre-wrap break-words px-5 pb-6 text-sm leading-relaxed text-foreground-muted sm:px-6 sm:text-base">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <h2 id="all-faqs" className="mb-5 scroll-mt-32 text-2xl font-semibold tracking-tight">All questions &amp; answers</h2>
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
          className="w-full h-14 ac-content-panel pl-12 pr-5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
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
        <div className="ac-content-panel p-12 flex justify-center">
          <Spinner className="w-7 h-7" />
        </div>
      ) : filteredFAQs.length === 0 ? (
        <div className="ac-content-panel p-12 text-center">
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

                <div className="ac-content-panel overflow-hidden">
                  {categoryFAQs.map((faq) => {
                    const open =
                      activeId === faq.id;

                    return (
                      <div
                        key={faq.id}
                        id={`faq-${faq.id}`}
                        className="border-b border-border last:border-b-0"
                      >
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`answer-${faq.id}`}
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
                          <div id={`answer-${faq.id}`} className="px-5 sm:px-6 pb-6">
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
