import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Auronix Commerce LLC.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      slug="terms"
      eyebrow="Legal"
      title="Terms of Service"
      description="The terms and conditions for using Auronix Commerce LLC services."
    />
  );
}
