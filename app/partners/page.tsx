'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from '@/components/site/states';
import { subscribeToList } from '@/lib/firebase-db';
import type { Partner, PartnerCategory } from '@/lib/types';
import { PARTNER_CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { Building2, Globe, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PartnersPage() {
  const [partners, setPartners] = useState<(Partner & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PartnerCategory | 'All'>('All');

  useEffect(() => {
    const unsubscribe = subscribeToList<Partner>(
      'partners',
      (data) => {
        const active = data.filter((p) => p.active);
        setPartners(active);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filtered =
    activeCategory === 'All'
      ? partners
      : partners.filter((p) => p.category === activeCategory);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Partners"
        title={<>Strong commerce starts with strong partnerships.</>}
        description="We work with brands, manufacturers, distributors, wholesalers, and suppliers who are committed to quality and long-term relationships."
      />

      <Section className="border-t border-border">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          {(['All', ...PARTNER_CATEGORIES] as const).map((cat) => (
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

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="We're building our partner network."
            description="We are actively connecting with quality suppliers, brands, and distributors. If you are interested in partnering with Auronix, we would like to hear from you."
            action={
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Partner With Us
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            }
          />
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((partner) => (
              <StaggerItem key={partner.id}>
                <div className="group rounded-2xl border border-border bg-card p-7 h-full hover:shadow-premium-lg transition-all">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                      {partner.logoUrl ? (
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-foreground-muted" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-foreground-muted tracking-wider uppercase">
                      {partner.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight mb-2">{partner.name}</h3>
                  {partner.description && (
                    <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                      {partner.description}
                    </p>
                  )}
                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Visit website
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      <CTASection
        title="Become a partner."
        description="We are always interested in connecting with quality suppliers, brands, and distributors."
        buttonText="Partner With Us"
        buttonHref="/contact"
        variant="dark"
      />
    </SiteLayout>
  );
}
