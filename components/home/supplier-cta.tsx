'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/site/reveal';

export function SupplierCTA() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 lg:py-32">
      <div className="absolute inset-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary-foreground/5"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: 80,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary-foreground/5"
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-primary-foreground/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
            For Suppliers
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-primary-foreground leading-[1.1] max-w-3xl mx-auto text-balance">
            Have products that belong in the marketplace?
          </h2>

          <p className="mt-6 text-lg text-primary-foreground/70 leading-relaxed max-w-xl mx-auto">
            We are interested in connecting with legitimate suppliers,
            distributors, manufacturers, wholesalers, and quality brands.
          </p>

          <Link
            href="/become-a-supplier"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3.5 text-sm font-medium text-primary hover:bg-primary-foreground/90 transition-all"
          >
            Become a Supplier
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}