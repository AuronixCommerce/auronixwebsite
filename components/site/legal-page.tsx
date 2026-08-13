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

  const sections = content?.sections || [];
  const lastUpdated = content?.lastUpdated ? new Date(content.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

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
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Sticky table of contents - desktop */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24">
                <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground-muted mb-4">
                  Contents
                </h3>
                <nav className="space-y-1">
                  {sections.map((section, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveSection(i);
                        document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
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
                      <p className="text-base text-foreground-muted leading-relaxed whitespace-pre-line">{section.body}</p>
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
