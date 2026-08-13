import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn('py-20 lg:py-32', className)}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  className?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-lg text-foreground-muted leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}
