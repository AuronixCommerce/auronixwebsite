import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { CTASection } from '@/components/site/cta-section';
import { FAQContent } from '@/components/site/faq-content';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers to common questions about Auronix Commerce LLC, supplier partnerships, marketplace operations, seller applications, and support.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Frequently Asked Questions"
        title={
          <>
            Answers to the questions
            that matter.
          </>
        }
        description="Explore answers about Auronix Commerce LLC, supplier relationships, marketplace operations, seller applications, and support."
      />

      <Section className="border-t border-border">
        <FAQContent />
      </Section>

      <CTASection
        title="Still have a question?"
        description="Our team is here to help with supplier partnerships, seller applications, marketplace operations, and general inquiries."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
