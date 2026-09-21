"use client";
import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";
export const spring = {
  type: "spring" as const,
  stiffness: 340,
  damping: 34,
  mass: 0.8,
};
export function MotionSystem({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      {children}
    </MotionConfig>
  );
}
