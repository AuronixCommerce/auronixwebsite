'use client';

import { MotionSystem } from '@/components/design/motion';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="auronix-theme"
    >
      <MotionSystem>{children}</MotionSystem>
    </NextThemesProvider>
  );
}
