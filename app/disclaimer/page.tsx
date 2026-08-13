import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Disclaimer for Auronix Commerce LLC.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      slug="disclaimer"
      eyebrow="Legal"
      title="Disclaimer"
      description="Important disclaimers regarding Auronix Commerce LLC services and information."
    />
  );
}
