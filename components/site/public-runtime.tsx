'use client';

import {
  usePathname,
} from 'next/navigation';

import { AIChatLauncher } from '@/components/site/ai-chat-launcher';
import { SelectionActions } from '@/components/site/selection-actions';

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
    pathname === '/ui-preview' || pathname === '/admin' ||
    pathname.startsWith(
      '/admin/'
    )
  ) {
    return (
      <>
        {children}

      </>
    );
  }

  /*
   * Maintenance page also gets a
   * clean standalone presentation.
   * Its own page renders AIChat.
   */
  if (
    pathname === '/aio/chat' || pathname ===
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

      {pathname !== '/support/chat' && !pathname.startsWith('/seller/') && (
        <>
          <SelectionActions />
          <AIChatLauncher />
        </>
      )}
    </>
  );
}

export default PublicRuntime;
