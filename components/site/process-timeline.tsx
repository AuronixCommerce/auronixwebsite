'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from '@/components/site/reveal';
import { PROCESS_STEPS_FULL } from '@/lib/constants';

export function ProcessTimeline() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Base vertical line */}
      <div className="absolute left-6 top-2 bottom-2 w-px bg-border" />

      {/* Animated vertical line */}
      <motion.div
        className="absolute left-6 top-2 w-px bg-accent"
        initial={{ height: '0%' }}
        whileInView={{ height: '100%' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{
          duration: shouldReduceMotion ? 0 : 2,
          ease: 'easeInOut',
        }}
      />

      <div className="space-y-12">
        {PROCESS_STEPS_FULL.map((step, i) => (
          <Reveal
            key={step.number}
            delay={i * 0.05}
          >
            <div className="flex gap-6">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center relative z-10">
                  <span className="text-xs font-semibold text-foreground-muted">
                    {step.number}
                  </span>
                </div>
              </div>

              <div className="flex-1 pb-2">
                <h3 className="text-xl font-semibold tracking-tight mb-3">
                  {step.title}
                </h3>

                <p className="text-base text-foreground-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
