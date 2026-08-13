import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { PROCESS_STEPS_FULL } from '@/lib/constants';
import { motion } from 'framer-motion';

export const metadata: Metadata = {
  title: 'Our Process',
  description:
    'A disciplined path from opportunity to marketplace. Discover how Auronix evaluates, sources, prepares, launches, optimizes, and scales commerce operations.',
  alternates: { canonical: '/our-process' },
};

export default function OurProcessPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Our Process"
        title={<>A disciplined path from opportunity to marketplace.</>}
        description="Every engagement follows a structured process — seven phases that turn a product opportunity into marketplace performance."
      />

      <Section className="border-t border-border">
        <ProcessTimeline />
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

function ProcessTimeline() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Vertical line */}
      <div className="absolute left-6 top-2 bottom-2 w-px bg-border" />

      {/* Animated progress line */}
      <motion.div
        className="absolute left-6 top-2 w-px bg-accent"
        initial={{ height: '0%' }}
        whileInView={{ height: '100%' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{
          duration: 2,
          ease: 'easeInOut',
        }}
      />

      <div className="space-y-12">
        {PROCESS_STEPS_FULL.map((step, i) => (
          <Reveal key={step.number} delay={i * 0.05}>
            <div className="flex gap-6">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center relative z-10">
                  <span className="text-xs font-semibold text-foreground-muted">
                    {step.number}
                  </span>
                </div>
              </div>

              <div className="flex-1 pb-2">
                <h3 className="text-xl font-semibold tracking-tight mb-3">
                  {step.title}
                </h3>

                <p className="text-base text-foreground-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}