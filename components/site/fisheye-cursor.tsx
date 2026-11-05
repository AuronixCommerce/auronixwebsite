'use client';

import { useEffect, useRef } from 'react';

export function FisheyeCursor() {
  const lensRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ x: -999, y: -999, tx: -999, ty: -999, active: false, raf: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const lens = lensRef.current;
    if (!lens) return;
    const state = stateRef.current;
    const RADIUS = 34;
    const EASE = 0.2;

    const onMove = (e: PointerEvent) => {
      state.tx = e.clientX;
      state.ty = e.clientY;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const isTarget = !!el.closest('a, button, h1, h2, h3, h4, h5, h6, .fisheye-target');
      if (isTarget !== state.active) {
        state.active = isTarget;
        lens.dataset.active = String(isTarget);
      }
    };
    const onLeave = () => {
      state.tx = -999; state.ty = -999; state.active = false;
      lens.dataset.active = 'false';
    };
    const tick = () => {
      state.x += (state.tx - state.x) * EASE;
      state.y += (state.ty - state.y) * EASE;
      lens.style.setProperty('--fx', `${state.x}px`);
      lens.style.setProperty('--fy', `${state.y}px`);
      lens.style.setProperty('--fr', `${RADIUS}px`);
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <div ref={lensRef} aria-hidden="true" className="fisheye-lens" data-active="false" />;
}
