import Link from 'next/link';
import { ArrowRight,PlayCircle } from 'lucide-react';
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
  return <SiteLayout><PageHeader eyebrow="Auronix Help Center" title={<>Technical help,<br />without the guesswork.</>} description="Follow clear, secure troubleshooting for seller applications, account access, verification, dashboard tools, catalogs, notifications, and browser problems." /><Section className="border-t border-border"><div className="mb-7"><DownloadPdfButton title="Auronix Help Center Handbook" markdown={helpHandbookMarkdown()} source="/help" label="Download all guides (PDF)"/></div><Link href="/guide" className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5 hover:bg-background-subtle"><PlayCircle className="h-9 w-9 shrink-0 text-accent"/><span className="flex-1"><strong className="block text-base">New here? Start with the video guide.</strong><span className="mt-1 block text-sm text-foreground-muted">Meet Auronix and AIO in two minutes, with captions, chapters, and a written quick start.</span></span><ArrowRight className="h-4 w-4 shrink-0"/></Link><HelpCenterContent /></Section><CTASection title="Still blocked after troubleshooting?" description="Send Support the affected page, approximate time, browser, and visible error. Never include passwords, OTPs, or secure tokens." buttonText="Contact Support" buttonHref="/support" /></SiteLayout>;
}
