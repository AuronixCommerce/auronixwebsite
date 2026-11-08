import { type ReactNode } from 'react';
// PublicSiteChrome owns navigation and the footer for every public route.
export function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="ac-page">{children}</div>;
}
export const AppShell = SiteLayout;
