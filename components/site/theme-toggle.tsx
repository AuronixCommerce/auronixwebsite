'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-10 items-center justify-center border border-border bg-card px-3 text-foreground',
        showLabel ? 'w-full' : 'shrink-0',
        className
      )}
    >
      <span className="text-xs font-semibold">{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
