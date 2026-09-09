import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn('ac-section', className)}>
      <div className="ac-container">{children}</div>
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
        'ac-section-heading',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow && (
        <span className="ac-eyebrow">

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
