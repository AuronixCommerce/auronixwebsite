'use client';

import { useEffect, useRef } from 'react';

/** A demand-rendered Three.js pointer accent for precise desktop pointers. */
export function CursorField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || !precisePointer.matches || reducedMotion.matches) return;

    let disposed = false;
    let cleanUp = () => {};

    void import('three').then((T) => {
      if (disposed) return;

      const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.setClearColor(0, 0);
      const scene = new T.Scene();
      const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 2;
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const color = new T.Color(`hsl(${accent.replace(/\s+/g, ',')})`);
      const ringGeometry = new T.RingGeometry(0.012, 0.018, 32);
      const ringMaterial = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: T.DoubleSide });
      const follower = new T.Mesh(ringGeometry, ringMaterial);
      follower.visible = false;
      scene.add(follower);

      type Burst = { mesh: InstanceType<typeof T.Mesh>; material: InstanceType<typeof T.MeshBasicMaterial>; life: number };
      const bursts: Burst[] = [];
      const target = new T.Vector2();
      const current = new T.Vector2();
      let frame = 0;
      let moving = false;
      let aspect = 1;
      let pulseTimer = 0;

      const resize = () => {
        aspect = window.innerWidth / Math.max(window.innerHeight, 1);
        camera.left = -aspect;
        camera.right = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      };
      const positionFromPointer = (event: PointerEvent, output: InstanceType<typeof T.Vector2>) => {
        output.set(((event.clientX / window.innerWidth) * 2 - 1) * aspect, -(event.clientY / window.innerHeight) * 2 + 1);
      };
      const render = () => {
        frame = 0;
        current.lerp(target, 0.22);
        follower.position.set(current.x, current.y, 0);
        moving = current.distanceTo(target) > 0.001;
        for (let index = bursts.length - 1; index >= 0; index -= 1) {
          const burst = bursts[index];
          burst.life -= 0.055;
          burst.mesh.scale.addScalar(0.13);
          burst.material.opacity = Math.max(0, burst.life * 0.55);
          if (burst.life <= 0) {
            scene.remove(burst.mesh);
            burst.material.dispose();
            bursts.splice(index, 1);
          }
        }
        renderer.render(scene, camera);
        if (moving || bursts.length) frame = requestAnimationFrame(render);
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
      const move = (event: PointerEvent) => {
        positionFromPointer(event, target);
        if (!follower.visible) {
          current.copy(target);
          follower.visible = true;
        }
        schedule();
      };
      const click = (event: PointerEvent) => {
        const point = new T.Vector2();
        positionFromPointer(event, point);
        const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: T.DoubleSide });
        const mesh = new T.Mesh(ringGeometry, material);
        mesh.position.set(point.x, point.y, 0);
        scene.add(mesh);
        bursts.push({ mesh, material, life: 1 });
        follower.scale.setScalar(0.72);
        window.clearTimeout(pulseTimer);
        pulseTimer = window.setTimeout(() => follower.scale.setScalar(1), 90);
        schedule();
      };
      const hide = () => { follower.visible = false; schedule(); };

      element.appendChild(renderer.domElement);
      resize();
      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerdown', click, { passive: true });
      document.documentElement.addEventListener('mouseleave', hide);
      cleanUp = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(pulseTimer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerdown', click);
        document.documentElement.removeEventListener('mouseleave', hide);
        bursts.forEach((burst) => burst.material.dispose());
        ringGeometry.dispose();
        ringMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => {});

    return () => {
      disposed = true;
      cleanUp();
    };
  }, []);

  return <div ref={host} className="ac-cursor-field" aria-hidden="true" />;
}
