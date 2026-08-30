import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { MARKETPLACE_EXPERTISE } from '@/lib/constants';
import { SHOP_URL } from '@/lib/constants';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Marketplace Expertise',
  description:
    'Built around modern marketplace commerce. Product selection, catalog preparation, marketplace operations, pricing, inventory coordination, and performance optimization.',
  alternates: { canonical: '/marketplace-expertise' },
};

export default function MarketplaceExpertisePage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Marketplace Expertise"
        title={<>Built around modern marketplace commerce.</>}
        description="Selling on marketplaces is not just about listing products. It requires deep understanding of how marketplaces work and disciplined management of every factor that drives performance."
      />

      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {MARKETPLACE_EXPERTISE.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <div className="group h-full bg-card p-10 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-[11px] font-mono text-accent tracking-wider">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-10 h-10 rounded-full border border-border group-hover:border-accent/30 transition-colors flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-foreground-muted group-hover:bg-accent transition-colors" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-4">{item.title}</h3>
                <p className="text-base text-foreground-muted leading-relaxed">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-t border-border bg-background-subtle">
        <Reveal>
          <div className="overflow-hidden rounded-[28px] border border-accent/20 bg-card p-7 shadow-sm sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                <ShoppingBag className="h-4 w-4" />
                Amazon affiliate product discovery
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Explore the Auronix Product Shop
              </h2>
              <p className="mt-4 text-base leading-7 text-foreground-muted">
                Discover and compare products selected by Auronix Commerce, then continue to Amazon to purchase. Auronix does not directly sell, charge, ship, fulfill, or manage customer orders, returns, refunds, or warranties. Amazon handles those services. Auronix Commerce may earn a commission from qualifying purchases.
              </p>
            </div>
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 lg:mt-0"
            >
              Visit Product Shop
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </Section>

      {/* Note about relationships */}
      <Section className="border-t border-border bg-background-subtle">
        <Reveal className="max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-8 lg:p-12">
            <h3 className="text-xl font-semibold tracking-tight mb-4">
              About marketplace relationships
            </h3>
            <p className="text-base text-foreground-muted leading-relaxed">
              Auronix operates as an independent commerce company. We do not claim official
              partnerships, authorizations, or affiliations with any specific marketplace platform
              unless explicitly verified and documented. Our expertise is built on operational
              experience, not on claimed relationships.
            </p>
          </div>
        </Reveal>
      </Section>

      <CTASection
        title="Let's build what's next."
        description="Whether you are a supplier looking for a marketplace partner or a brand seeking distribution expertise, we would like to hear from you."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
