"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
interface Props {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}
export function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.animate(
            [
              { transform: "translateY(16px)", opacity: 0.65 },
              { transform: "translateY(0)", opacity: 1 },
            ],
            {
              duration: 450,
              delay: Math.min(delay * 1000, 160),
              easing: "cubic-bezier(.22,1,.36,1)",
            },
          );
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
export function StaggerGroup({ children, className }: Props) {
  return <div className={cn("ac-stagger", className)}>{children}</div>;
}
export const StaggerItem = Reveal;
export const FadeIn = Reveal;
