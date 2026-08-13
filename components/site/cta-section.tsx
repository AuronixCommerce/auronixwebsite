import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './reveal';

interface CTASectionProps {
  title: string;
  description?: string;
  buttonText: string;
  buttonHref: string;
  variant?: 'light' | 'dark';
}

export function CTASection({
  title,
  description,
  buttonText,
  buttonHref,
  variant = 'light',
}: CTASectionProps) {
  const isDark = variant === 'dark';

  return (
    <section className={isDark ? 'bg-primary' : 'bg-background-subtle'}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20 lg:py-32">
        <Reveal className="max-w-2xl">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] text-balance ${
              isDark ? 'text-primary-foreground' : 'text-foreground'
            }`}
          >
            {title}
          </h2>
          {description && (
            <p
              className={`mt-5 text-lg leading-relaxed text-pretty ${
                isDark ? 'text-primary-foreground/70' : 'text-foreground-muted'
              }`}
            >
              {description}
            </p>
          )}
          <Link
            href={buttonHref}
            className={`group mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
              isDark
                ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {buttonText}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
