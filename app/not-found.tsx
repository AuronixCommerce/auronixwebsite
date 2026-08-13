'use client';

import Link from 'next/link';
import { SiteLayout } from '@/components/site/site-layout';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { Button } from '@/components/ui/button';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <SiteLayout>
      <Section className="min-h-[70vh] flex items-center">
        <Reveal className="max-w-lg mx-auto text-center">
          <p className="text-[120px] lg:text-[160px] font-semibold tracking-tighter text-border-strong leading-none mb-4">
            404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-4">Page not found.</h1>
          <p className="text-lg text-foreground-muted leading-relaxed mb-8">
            The page you are looking for may have been moved, removed, or never existed. Let us help you get back on track.
          </p>
          <Link href="/">
            <Button size="lg">
              <Home className="w-4 h-4 mr-2" />
              Return Home
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </Reveal>
      </Section>
    </SiteLayout>
  );
}
