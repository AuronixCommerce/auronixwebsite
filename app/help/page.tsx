import { DownloadPdfButton } from '@/components/documents/download-pdf-button';
import { helpHandbookMarkdown } from '@/lib/documents/guides';
import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { CTASection } from '@/components/site/cta-section';
import { HelpCenterContent } from '@/components/site/help-center-content';

export const metadata: Metadata = {
  title: 'Help Center & Seller Troubleshooting',
  description: 'Technical troubleshooting for Auronix seller applications, email verification, account invitations, password reset, seller dashboard, catalogs, products, notifications, and support.',
  alternates: { canonical: '/help' },
};

export default function HelpCenterPage() {
  return <SiteLayout><PageHeader eyebrow="Auronix Help Center" title={<>Technical help,<br />without the guesswork.</>} description="Follow clear, secure troubleshooting for seller applications, account access, verification, dashboard tools, catalogs, notifications, and browser problems." /><Section className="border-t border-border"><div className="mb-7"><DownloadPdfButton title="Auronix Help Center Handbook" markdown={helpHandbookMarkdown()} source="/help" label="Download all guides (PDF)"/></div><HelpCenterContent /></Section><CTASection title="Still blocked after troubleshooting?" description="Send Support the affected page, approximate time, browser, and visible error. Never include passwords, OTPs, or secure tokens." buttonText="Contact Support" buttonHref="/support" /></SiteLayout>;
}
