import type { Metadata } from 'next';

import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { BlogContent } from '@/components/site/blog-content';

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Insights from Auronix Commerce LLC on e-commerce, procurement, marketplace operations, supplier partnerships, and growth.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Insights"
        title={
          <>
            Ideas, perspective, and
            <span className="text-foreground-muted">
              {' '}marketplace intelligence.
            </span>
          </>
        }
        description="Explore practical thinking from Auronix Commerce LLC across procurement, e-commerce, supplier partnerships, and marketplace operations."
      />

      <Section className="border-t border-border">
        <BlogContent />
      </Section>
    </SiteLayout>
  );
}
