'use client';

import { useEffect } from 'react';

const SURFACE_SELECTOR = [
  '.ac-glass',
  '.ac-nav',
  '.ac-mega',
  '.ac-content-panel',
  '.ac-form-panel',
  '.ac-application-panel',
  '.ac-feature',
  '.ac-journey-story',
  '.ac-workspace-sidebar',
  '.ac-workspace-toolbar',
  '.ac-workspace-dock',
  '.ac-button',
  'button[class*="bg-primary"]',
  'a[class*="bg-primary"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(',');

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [role="tab"]';

function clearSurface(surface: HTMLElement | null) {
  if (!surface) return;
  surface.removeAttribute('data-ac-liquid-active');
  surface.removeAttribute('data-ac-liquid-pressed');
  surface.style.removeProperty('--ac-liquid-shift-x');
  surface.style.removeProperty('--ac-liquid-shift-y');
  surface.style.removeProperty('--ac-liquid-scale-x');
  surface.style.removeProperty('--ac-liquid-scale-y');
}

export function LiquidGlassRuntime() {
  useEffect(() => {
    const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;
    if (!precisePointer.matches || reducedMotion.matches) {
      root.dataset.acLiquid = 'static';
      return () => { delete root.dataset.acLiquid; };
    }

    const userReducedMotion = () => {
      try { return localStorage.getItem('auronix-reduce-glass-motion') === 'true'; } catch { return false; }
    };
    root.dataset.acReduceMotion = String(userReducedMotion());
    root.dataset.acLiquid = userReducedMotion() ? 'static' : 'live';
    let active: HTMLElement | null = null;
    let frame = 0;
    let latestEvent: PointerEvent | null = null;
    let previousX = window.innerWidth / 2;
    let previousY = window.innerHeight / 2;

    const render = () => {
      frame = 0;
      const event = latestEvent;
      if (!event) return;
      if (root.dataset.acLiquid !== 'live') { clearSurface(active); active = null; return; }

      const viewportX = event.clientX / Math.max(window.innerWidth, 1);
      const viewportY = event.clientY / Math.max(window.innerHeight, 1);
      root.style.setProperty('--ac-pointer-x', `${event.clientX}px`);
      root.style.setProperty('--ac-pointer-y', `${event.clientY}px`);
      root.style.setProperty('--ac-scene-x', `${(viewportX - 0.5) * 24}px`);
      root.style.setProperty('--ac-scene-y', `${(viewportY - 0.5) * 18}px`);
      root.style.setProperty('--ac-scene-x-soft', `${(viewportX - 0.5) * -9}px`);
      root.style.setProperty('--ac-scene-y-soft', `${(viewportY - 0.5) * -6}px`);
      root.style.setProperty('--ac-scene-x-deep', `${(viewportX - 0.5) * 15}px`);
      root.style.setProperty('--ac-scene-y-deep', `${(viewportY - 0.5) * 11}px`);

      const candidate = (event.target as Element | null)?.closest<HTMLElement>(SURFACE_SELECTOR) || null;
      if (candidate !== active) {
        clearSurface(active);
        active = candidate;
      }

      if (active) {
        const rect = active.getBoundingClientRect();
        const localX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100));
        const localY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100));
        const normalizedX = localX / 100 - 0.5;
        const normalizedY = localY / 100 - 0.5;
        const interactive = active.matches(INTERACTIVE_SELECTOR);
        const velocityX = Math.min(1, Math.abs(event.clientX - previousX) / 34);
        const velocityY = Math.min(1, Math.abs(event.clientY - previousY) / 34);

        active.dataset.acLiquidActive = 'true';
        active.style.setProperty('--ac-liquid-x', `${localX}%`);
        active.style.setProperty('--ac-liquid-y', `${localY}%`);
        active.style.setProperty('--ac-liquid-shift-x', `${normalizedX * (interactive ? 5 : 1.4)}px`);
        active.style.setProperty('--ac-liquid-shift-y', `${normalizedY * (interactive ? 4 : 1.1)}px`);
        active.style.setProperty('--ac-liquid-scale-x', `${1 + velocityX * (interactive ? 0.018 : 0.006)}`);
        active.style.setProperty('--ac-liquid-scale-y', `${1 + velocityY * (interactive ? 0.018 : 0.006)}`);
      }

      previousX = event.clientX;
      previousY = event.clientY;
    };

    const onPointerMove = (event: PointerEvent) => {
      latestEvent = event;
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onPointerDown = (event: PointerEvent) => {
      const surface = (event.target as Element | null)?.closest<HTMLElement>(SURFACE_SELECTOR);
      if (!surface) return;
      surface.dataset.acLiquidPressed = 'true';
      window.setTimeout(() => surface.removeAttribute('data-ac-liquid-pressed'), 180);
    };
    const onPointerLeave = () => {
      clearSurface(active);
      active = null;
      root.removeAttribute('data-ac-pointer');
    };
    const onPointerEnter = () => { root.dataset.acPointer = 'visible'; };
    const onMotionPreference = () => {
      const reduced = userReducedMotion();
      root.dataset.acReduceMotion = String(reduced);
      root.dataset.acLiquid = reduced ? 'static' : 'live';
      if (reduced) { clearSurface(active); active = null; }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('mouseleave', onPointerLeave);
    document.documentElement.addEventListener('mouseenter', onPointerEnter);
    window.addEventListener('auronix:motion-preference', onMotionPreference);

    return () => {
      cancelAnimationFrame(frame);
      clearSurface(active);
      delete root.dataset.acLiquid;
      delete root.dataset.acPointer;
      root.style.removeProperty('--ac-pointer-x');
      root.style.removeProperty('--ac-pointer-y');
      root.style.removeProperty('--ac-scene-x');
      root.style.removeProperty('--ac-scene-y');
      root.style.removeProperty('--ac-scene-x-soft');
      root.style.removeProperty('--ac-scene-y-soft');
      root.style.removeProperty('--ac-scene-x-deep');
      root.style.removeProperty('--ac-scene-y-deep');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('mouseleave', onPointerLeave);
      document.documentElement.removeEventListener('mouseenter', onPointerEnter);
      window.removeEventListener('auronix:motion-preference', onMotionPreference);
    };
  }, []);

  return <div className="ac-liquid-light" aria-hidden="true" />;
}
