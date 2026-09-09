'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { LoadingState, ErrorState, EmptyState } from '@/components/site/states';
import { getData } from '@/lib/firebase-db';
import type { LegalContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LegalRichText } from '@/components/site/legal-rich-text';
import { FileText, Menu, X } from 'lucide-react';

interface LegalPageProps {
  slug: 'privacy' | 'terms' | 'disclaimer' | 'cookie-policy';
  title: string;
  eyebrow: string;
  description: string;
}

export function LegalPage({ slug, title, eyebrow, description }: LegalPageProps) {
  const [content, setContent] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    getData<LegalContent>(`legal/${slug}`)
      .then((data) => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const sections = content?.sections || [];
  const lastUpdated = content?.lastUpdated ? new Date(content.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  const openSection = (index: number) => {
    setActiveSection(index);
    setMobileMenuOpen(false);
    window.setTimeout(() => {
      document.getElementById(`section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 20);
  };

  return (
    <SiteLayout>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Section className="border-t border-border">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : sections.length === 0 ? (
          <EmptyState
            title="This page is being updated."
            description="The content for this page is currently being prepared. Please check back soon."
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:hidden">
              <button type="button" onClick={() => setMobileMenuOpen(true)} aria-haspopup="dialog" aria-expanded={mobileMenuOpen} className="flex min-h-12 w-full items-center justify-between ac-content-panel px-4 py-3 text-left shadow-sm transition hover:border-accent/35 hover:bg-secondary/40">
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Menu className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">On this page</span><span className="block truncate text-sm font-semibold">{sections[activeSection]?.heading || 'Browse contents'}</span></span></span><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground-muted">{activeSection + 1} / {sections.length}</span>
              </button>
            </div>

            {mobileMenuOpen && <div className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm lg:hidden" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMobileMenuOpen(false); }}><aside role="dialog" aria-modal="true" aria-label={`${title} contents`} className="ml-auto flex h-full w-[min(88vw,390px)] flex-col border-l border-border bg-background shadow-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileText className="h-4 w-4" /></span><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">Legal document</div><div className="mt-0.5 font-semibold">{title}</div></div></div><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close contents menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:bg-secondary"><X className="h-4 w-4" /></button></div><nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-label="Legal page sections"><div className="space-y-1">{sections.map((section, i) => <button key={i} type="button" onClick={() => openSection(i)} className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors', activeSection === i ? 'bg-accent/10 font-semibold text-foreground' : 'text-foreground-muted hover:bg-secondary hover:text-foreground')}><span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', activeSection === i ? 'bg-accent text-white' : 'bg-secondary text-foreground-muted')}>{i + 1}</span><span className="leading-6">{section.heading}</span></button>)}</div></nav>{lastUpdated && <div className="border-t border-border px-5 py-4 text-xs text-foreground-muted">Last updated: {lastUpdated}</div>}</aside></div>}

            {/* Sticky table of contents - desktop */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col">
                <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground-muted mb-4">
                  Contents
                </h3>
                <nav className="min-h-0 space-y-1 overflow-y-auto overscroll-contain pr-2">
                  {sections.map((section, i) => (
                    <button
                      key={i}
                      onClick={() => openSection(i)}
                      className={cn(
                        'block text-left text-sm py-1.5 px-3 rounded-md transition-colors w-full',
                        activeSection === i
                          ? 'text-foreground font-medium bg-secondary'
                          : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {section.heading}
                    </button>
                  ))}
                </nav>
                {lastUpdated && (
                  <p className="mt-6 text-xs text-foreground-muted">
                    Last updated: {lastUpdated}
                  </p>
                )}
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-9">
              <Reveal>
                <div className="space-y-10">
                  {sections.map((section, i) => (
                    <div key={i} id={`section-${i}`} className="scroll-mt-24">
                      <h2 className="text-xl font-semibold tracking-tight mb-4">{section.heading}</h2>
                      <LegalRichText value={section.body} />
                    </div>
                  ))}
                </div>
                {lastUpdated && (
                  <p className="mt-12 pt-8 border-t border-border text-xs text-foreground-muted">
                    Last updated: {lastUpdated}
                  </p>
                )}
              </Reveal>
            </div>
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}
