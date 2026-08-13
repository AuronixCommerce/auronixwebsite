import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { CTASection } from '@/components/site/cta-section';
import { ProcessTimeline } from '@/components/site/process-timeline';

export const metadata: Metadata = {
  title: 'Our Process',
  description:
    'A disciplined path from opportunity to marketplace. Discover how Auronix evaluates, sources, prepares, launches, optimizes, and scales commerce operations.',
  alternates: {
    canonical: '/our-process',
  },
};

export default function OurProcessPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Our Process"
        title={
          <>
            A disciplined path from opportunity to marketplace.
          </>
        }
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
