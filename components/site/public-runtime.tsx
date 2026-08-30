'use client';

import {
  usePathname,
} from 'next/navigation';

import {
  AIChat,
} from '@/components/site/ai-chat';

import {
  SiteAnnouncementPopup,
} from '@/components/site/site-announcement-popup';

import {
  PublicSiteChrome,
} from '@/components/site/public-site-chrome';
import { ThemeToggle } from '@/components/site/theme-toggle';

export function PublicRuntime({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();

  /*
   * ADMIN IS COMPLETELY OUTSIDE
   * THE PUBLIC EXPERIENCE.
   */
  if (
    pathname === '/admin' ||
    pathname.startsWith(
      '/admin/'
    )
  ) {
    return (
      <>
        {children}
        <ThemeToggle className="fixed bottom-5 right-5 z-[100] shadow-lg" />
      </>
    );
  }

  /*
   * Maintenance page also gets a
   * clean standalone presentation.
   * Its own page renders AIChat.
   */
  if (
    pathname ===
    '/maintenance'
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <>
      <PublicSiteChrome>
        {children}
      </PublicSiteChrome>

      <SiteAnnouncementPopup />

      <AIChat />
    </>
  );
}

export default PublicRuntime;
