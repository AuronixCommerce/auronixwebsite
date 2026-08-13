import { type ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
