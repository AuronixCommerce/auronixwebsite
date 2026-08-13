import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { SOLUTIONS } from '@/lib/constants';
import {
  Handshake,
  Search,
  Store,
  FileText,
  Truck,
  TrendingUp,
  Check,
  ArrowRight,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'Commerce solutions from Auronix: supplier partnerships, procurement, marketplace operations, catalog management, distribution, and e-commerce strategy.',
  alternates: { canonical: '/solutions' },
};

const ICON_MAP: Record<string, LucideIcon> = {
  Handshake,
  Search,
  Store,
  FileText,
  Truck,
  TrendingUp,
};

const LAYOUTS = ['split-right', 'split-left', 'full', 'split-right', 'split-left', 'full'];

export default function SolutionsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Solutions"
        title={<>Commerce solutions designed to move products forward.</>}
        description="From supplier partnerships to marketplace operations, Auronix provides the capabilities that move quality products from source to sale."
      />

      <Section className="border-t border-border">
        <div className="space-y-20 lg:space-y-28">
          {SOLUTIONS.map((solution, i) => {
            const Icon = ICON_MAP[solution.icon];
            const layout = LAYOUTS[i];
            const isFull = layout === 'full';
            const isReversed = layout === 'split-left';

            return (
              <div key={solution.title}>
                <Reveal>
                  <div
                    className={`grid gap-8 lg:gap-16 items-center ${
                      isFull ? 'lg:grid-cols-1' : 'lg:grid-cols-2'
                    } ${isReversed ? 'lg:[direction:rtl]' : ''}`}
                  >
                    {/* Text */}
                    <div className={isReversed ? 'lg:[direction:ltr]' : ''}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                          <Icon className="w-5 h-5 text-foreground" />
                        </div>
                        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
                          {String(i + 1).padStart(2, '0')} / {String(SOLUTIONS.length).padStart(2, '0')}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15] mb-5 text-balance">
                        {solution.title}
                      </h2>
                      <p className="text-lg text-foreground-muted leading-relaxed mb-6">
                        {solution.description}
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-3">
                        {solution.points.map((point) => (
                          <li key={point} className="flex items-center gap-2.5 text-sm text-foreground">
                            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-accent" />
                            </div>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual */}
                    {!isFull && (
                      <div className={isReversed ? 'lg:[direction:ltr]' : ''}>
                        <SolutionVisual index={i} Icon={Icon} />
                      </div>
                    )}
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
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

function SolutionVisual({ index, Icon }: { index: number; Icon: LucideIcon }) {
  return (
    <div className="relative aspect-square max-w-md mx-auto">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary to-background-subtle border border-border" />
      <div className="absolute inset-0 bg-dots opacity-30 rounded-3xl" />

      {/* Central icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-3xl bg-card border border-border shadow-premium-lg flex items-center justify-center">
          <Icon className="w-12 h-12 text-foreground" />
        </div>
      </div>

      {/* Orbiting elements */}
      {[0, 1, 2, 3].map((j) => {
        const angle = (j * 90 + index * 30) * (Math.PI / 180);
        const radius = 140;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={j}
            className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <div className="w-full h-full rounded-2xl bg-card border border-border shadow-premium flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent/60" />
            </div>
          </div>
        );
      })}

      {/* Connecting circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-border/50" />
    </div>
  );
}
