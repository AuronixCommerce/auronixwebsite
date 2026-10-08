'use client';

import Link from 'next/link';
import { SiteLayout } from '@/components/site/site-layout';
import { Section } from '@/components/site/section';
import { ArrowRight, Home, Search, Sparkles } from 'lucide-react';
import { openSearch } from '@/components/design/search-trigger';
import { openAio } from '@/lib/aio-selection';

export default function NotFound() {
  return (
    <SiteLayout>
      <Section className="min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto text-center">
          <p className="ac-eyebrow mb-5">Error 404</p>
          <h1 className="text-3xl font-semibold tracking-tight mb-4">Page not found.</h1>
          <p className="text-lg text-foreground-muted leading-relaxed mb-8">
            The page you are looking for may have been moved, removed, or never existed. Let us help you get back on track.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/" className="ac-button">
              <Home className="w-4 h-4 mr-2" />
              Return Home
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <button type="button" className="ac-button ac-button-secondary" onClick={openSearch}>
              <Search className="h-4 w-4" /> Search the site
            </button>
            <button type="button" className="ac-button ac-button-secondary" onClick={() => openAio('Help me find the right page on Auronix Commerce.')}>
              <Sparkles className="h-4 w-4" /> Ask AIO
            </button>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
