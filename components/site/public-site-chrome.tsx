'use client';

import {
  usePathname,
} from 'next/navigation';

import { SearchHost } from '@/components/design/search-trigger';
import {
  Header,
} from './header';

import {
  Footer,
} from './footer';

export function PublicSiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const isPrivateArea =
    pathname === null ||
    pathname.startsWith(
      '/admin'
    ) ||
    pathname.startsWith(
      '/api'
    ) ||
    pathname.startsWith(
      '/auth'
    ) ||
    pathname.startsWith('/seller/activate') ||
    pathname === '/seller/login' ||
    pathname.startsWith('/seller/dashboard') ||
    pathname === '/seller/profile' ||
    pathname === '/seller/settings' ||
    pathname === '/seller/support';

  if (
    isPrivateArea
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <>
      <a className="ac-skip" href="#main-content">Skip to content</a>
      <Header />
      <SearchHost />

      <main id="main-content" tabIndex={-1} className="ac-shell">
        {children}
      </main>

      <Footer />
    </>
  );
}
