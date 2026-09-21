import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
interface Props {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}
export function Reveal({ children, delay = 0, className }: Props) {
  void delay;
  return (
    <div className={className}>
      {children}
    </div>
  );
}
export function StaggerGroup({ children, className }: Props) {
  return <div className={cn("ac-stagger", className)}>{children}</div>;
}
export const StaggerItem = Reveal;
export const FadeIn = Reveal;
