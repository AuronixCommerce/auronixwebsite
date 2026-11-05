import { ReactNode } from 'react';
import { FloatingHeader } from './floating-header';
import { FisheyeCursor } from './fisheye-cursor';

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ac-page">
      <FloatingHeader />
      <FisheyeCursor />
      {children}
    </div>
  );
}

export const AppShell = SiteLayout;
