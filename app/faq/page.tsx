import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { CTASection } from '@/components/site/cta-section';
import { FAQContent } from '@/components/site/faq-content';
import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';
import { DEFAULT_FAQS } from '@/lib/help-content';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers to common questions about Auronix Commerce LLC, supplier partnerships, marketplace operations, seller applications, and support.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DEFAULT_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <SiteLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />
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

      <Section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Wrench className="h-5 w-5" /></span><div><h2 className="text-2xl font-semibold">Need step-by-step troubleshooting?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">Open technical guides for seller login, application verification, account invitations, dashboard access, catalogs, notifications, and browser issues.</p></div></div>
            <Link href="/help" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Open Help Center <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
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
