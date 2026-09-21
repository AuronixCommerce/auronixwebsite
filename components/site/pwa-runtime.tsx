'use client';
import { useEffect } from 'react';

export function PwaRuntime() {
  useEffect(() => {
    try {
      const reduced = localStorage.getItem('auronix-reduce-glass-motion') === 'true';
      document.documentElement.dataset.acReduceMotion = String(reduced);
    } catch {}
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  }, []);
  return null;
}
