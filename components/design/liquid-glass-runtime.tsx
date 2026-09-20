'use client';

import { useEffect } from 'react';

export function LiquidGlassRuntime() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
    const root = document.documentElement;
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;

    const readPreference = () => {
      try {
        return localStorage.getItem('auronix-reduce-glass-motion') === 'true';
      } catch {
        return false;
      }
    };

    const applyPerformanceMode = () => {
      const userReduced = readPreference();
      const constrained =
        reducedMotion.matches ||
        coarsePointer.matches ||
        connection?.saveData === true ||
        (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);

      root.dataset.acReduceMotion = String(userReduced || reducedMotion.matches);
      root.dataset.acPerformance = constrained ? 'economy' : 'balanced';
      root.dataset.acLiquid = 'static';
    };

    applyPerformanceMode();
    reducedMotion.addEventListener('change', applyPerformanceMode);
    coarsePointer.addEventListener('change', applyPerformanceMode);
    window.addEventListener('auronix:motion-preference', applyPerformanceMode);

    return () => {
      delete root.dataset.acLiquid;
      delete root.dataset.acPerformance;
      reducedMotion.removeEventListener('change', applyPerformanceMode);
      coarsePointer.removeEventListener('change', applyPerformanceMode);
      window.removeEventListener('auronix:motion-preference', applyPerformanceMode);
    };
  }, []);

  return null;
}
