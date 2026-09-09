'use client';
import { Spinner } from '@/components/design/primitives';

import { useEffect, useState } from 'react';

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { SiteLayout } from '@/components/site/site-layout';

type Release = {
  id: string;
  version?: string;
  title?: string;
  summary?: string;
  releaseDate?: number;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
};

const PLATFORM_RELEASE: Release = {
  id: 'platform-experience-2026-08-29',
  version: '2026.08',
  title: 'Seller workspace and site experience upgrade',
  summary: 'A production-focused release improving seller access, live account visibility, supplier onboarding, legal content, appearance, and transactional account flows.',
  releaseDate: Date.UTC(2026, 7, 29),
  features: [
    'Five-step seller application with WhatsApp verification, selected-email OTP, automatic progress saving, and private resume IDs.',
    'Live seller verification center for account, email, WhatsApp, and business-profile status.',
    'Dedicated seller access chooser with separate login and new-account application paths.',
    'Persistent light and dark appearance across public, authentication, seller, and admin experiences.',
    'Database-connected seller products, catalogs, profile, settings, and support workspace.',
    'Supplier application experience with structured validation and database persistence.',
  ],
  fixes: [
    'Seller submission now validates only the selected verified email, so an old unselected email cannot incorrectly block submission.',
    'Maintenance toggles now persist immediately, remain off after reload, and cannot be silently reactivated by stale schedules or health checks.',
    'Stopping an AI answer now preserves only the response text that was visible when Stop was pressed.',
    'Seller approval invitations and password reset links now use secure, reliable token handling.',
    'Cookie Policy links now resolve correctly, including compatibility for older /cookies links.',
    'Legal-page bold text, italics, links, and lists now render instead of appearing as raw symbols.',
  ],
  improvements: [
    'Dedicated page SEO, crawl controls, structured organization data, enriched social cards, and a unified Auronix banner preview across search and social platforms.',
    'Auronix AI now uses the circular Auronix brand mark with a compact AI badge in the launcher and chat header.',
    'Consistent Auronix circular brand mark across public, seller, admin, and account screens.',
    'Responsive navigation and theme controls with improved desktop and mobile spacing.',
    'Live legal-content preview for administrators before publishing updates.',
  ],
};

export default function WhatsNewPage() {
  const [releases, setReleases] =
    useState<Release[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetch(
      '/api/public/changelog',
      {
        cache: 'no-store',
      }
    )
      .then(
        (response) =>
          response.json()
      )
      .then((data) => {
        const published = Array.isArray(data) ? data as Release[] : [];
        setReleases([PLATFORM_RELEASE, ...published.filter((release) => release.id !== PLATFORM_RELEASE.id)]);
      })
      .catch((error) => {
        console.error(
          'Unable to load changelog:',
          error
        );
        setReleases([PLATFORM_RELEASE]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-24">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_72%)]" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              What's New
            </div>

            <h1 className="mt-6 text-[clamp(2.75rem,6vw,5.5rem)] font-semibold tracking-[-0.03em] leading-[1.02]">
              What we've been building.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-foreground-muted">
              Follow the evolution of the Auronix Commerce
              experience — from new capabilities and improved
              workflows to fixes and refinements across the platform.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-6 w-6 animate-spin" />
            </div>
          ) : releases.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <h2 className="text-xl font-semibold">
                No releases published yet.
              </h2>

              <p className="mt-2 text-sm text-foreground-muted">
                Check back soon for product updates.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {releases.map(
                (release, index) => (
                  <article
                    key={release.id}
                    className="relative rounded-3xl border border-border bg-card p-7 sm:p-9"
                  >
                    {index === 0 && (
                      <div className="absolute right-6 top-6 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                        Latest
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                          {release.version}
                        </span>

                        {release.releaseDate ? (
                          <span className="text-xs text-foreground-muted">
                            {new Date(
                              release.releaseDate
                            ).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        {release.title}
                      </h2>

                      <p className="max-w-3xl text-sm leading-7 text-foreground-muted sm:text-base">
                        {release.summary}
                      </p>
                    </div>

                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                      <ReleaseGroup
                        icon={
                          <Sparkles className="h-4 w-4" />
                        }
                        title="New & Improved"
                        items={
                          release.features ||
                          release.improvements ||
                          []
                        }
                      />

                      <ReleaseGroup
                        icon={
                          <CheckCircle2 className="h-4 w-4" />
                        }
                        title="Fixes"
                        items={
                          release.fixes ||
                          []
                        }
                      />

                      <ReleaseGroup
                        icon={
                          <Wrench className="h-4 w-4" />
                        }
                        title="Refinements"
                        items={
                          release.improvements ||
                          []
                        }
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
            <h2 className="text-2xl font-semibold">
              Keep up with Auronix.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-muted">
              New features, experience improvements, business tools,
              support upgrades, and platform refinements will appear
              here as Auronix evolves.
            </p>

            <a
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              Return to Auronix
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ReleaseGroup({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-foreground-muted">
          No updates in this category.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map(
            (item, index) => (
              <div
                key={`${item}-${index}`}
                className="text-sm leading-6 text-foreground-muted"
              >
                {item}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
