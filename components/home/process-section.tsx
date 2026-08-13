'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/site/reveal';
import { Section, SectionHeading } from '@/components/site/section';
import { PROCESS_STEPS } from '@/lib/constants';

export function ProcessSection() {
  return (
    <Section className="border-t border-border">
      <SectionHeading
        eyebrow="Process"
        title="From supplier to marketplace, with precision."
        description="A structured path that turns opportunity into marketplace performance."
      />

      <div className="hidden lg:block mt-16">
        <div className="relative">
          <div className="absolute top-7 left-0 right-0 h-px bg-border" />

          <motion.div
            className="absolute top-7 left-0 h-px bg-accent"
            initial={{ width: '0%' }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />

          <div className="grid grid-cols-5 gap-4">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center mb-5 relative z-10">
                  <span className="text-sm font-semibold text-foreground-muted">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-base font-semibold tracking-tight mb-2">
                  {step.title}
                </h3>

                <p className="text-sm text-foreground-muted leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden mt-12 space-y-8">
        {PROCESS_STEPS.map((step, i) => (
          <Reveal key={step.number} delay={i * 0.05}>
            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-foreground-muted">
                    {step.number}
                  </span>
                </div>

                {i < PROCESS_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-2" />
                )}
              </div>

              <div className="pb-2">
                <h3 className="text-base font-semibold tracking-tight mb-2">
                  {step.title}
                </h3>

                <p className="text-sm text-foreground-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}