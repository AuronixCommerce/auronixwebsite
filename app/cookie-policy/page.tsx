import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie Policy for Auronix Commerce LLC.',
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      slug="cookie-policy"
      eyebrow="Legal"
      title="Cookie Policy"
      description="How Auronix Commerce LLC uses cookies and similar technologies."
    />
  );
}
