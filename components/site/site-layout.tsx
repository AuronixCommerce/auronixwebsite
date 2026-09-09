import { ReactNode } from 'react';
export function SiteLayout({children}:{children:ReactNode}){return <div className="ac-page">{children}</div>;}
export const AppShell=SiteLayout;
