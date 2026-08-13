import Link from 'next/link';
import { ArrowRight, Search, Store, Handshake, Truck } from 'lucide-react';
import { SiteLayout } from '@/components/site/site-layout';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CommerceFlow } from '@/components/site/commerce-flow';
import { CTASection } from '@/components/site/cta-section';
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from '@/lib/constants';
import { motion, useReducedMotion } from 'framer-motion';

const ICON_MAP = { Search, Store, Handshake, Truck };

export default function HomePage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 lg:pt-28 pb-20 lg:pb-32">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[100px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: typography */}
            <div className="lg:col-span-7">
              <Reveal>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Auronix Commerce LLC
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="text-[clamp(2.75rem,6vw,5.5rem)] font-semibold tracking-[-0.03em] leading-[1.02] text-foreground text-balance">
                  Powering the next generation of commerce.
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-7 text-lg lg:text-xl text-foreground-muted leading-relaxed max-w-xl text-pretty">
                  Auronix Commerce LLC connects quality suppliers, brands, and online marketplaces
                  through smarter procurement, distribution, and e-commerce operations.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-9 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    Partner With Us
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/our-process"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:border-border-strong hover:bg-secondary transition-all"
                  >
                    Explore Our Process
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right: commerce flow visual */}
            <div className="lg:col-span-5">
              <Reveal delay={0.2} className="lg:pl-4">
                <CommerceFlow />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] text-balance">
              Commerce built around better connections.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-5">
              <p className="text-lg text-foreground-muted leading-relaxed">
                Auronix operates at the intersection of procurement, marketplace operations, and
                distribution. We work with suppliers and brands to move quality products through
                the right channels — efficiently, profitably, and with the operational discipline
                that modern commerce demands.
              </p>
              <p className="text-lg text-foreground-muted leading-relaxed">
                Our approach is structured: we evaluate every opportunity, build relationships with
                the right partners, and manage the full lifecycle from sourcing to marketplace
                performance.
              </p>
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 text-sm font-medium text-foreground hover:gap-3 transition-all"
              >
                Learn more about Auronix
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* CAPABILITIES */}
      <Section className="border-t border-border bg-background-subtle">
        <SectionHeading
          eyebrow="Capabilities"
          title="What we do."
          description="Four core capabilities that define how Auronix creates value across the commerce lifecycle."
        />
        <StaggerGroup className="mt-14 grid sm:grid-cols-2 gap-5">
          {CAPABILITIES.map((cap, i) => {
            const Icon = ICON_MAP[cap.icon as keyof typeof ICON_MAP];
            return (
              <StaggerItem key={cap.title}>
                <div
                  className={`group relative rounded-2xl border border-border bg-card p-8 hover:shadow-premium-lg transition-all duration-300 ${
                    i % 2 === 0 ? 'lg:translate-y-0' : 'lg:translate-y-6'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                    <Icon className="w-5 h-5 text-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight mb-3">{cap.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{cap.description}</p>
                  <ArrowRight className="w-4 h-4 text-foreground-muted mt-5 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Section>

      {/* PROCESS */}
      <ProcessSection />

      {/* WHY AURONIX */}
      <Section className="border-t border-border bg-background-subtle">
        <SectionHeading
          eyebrow="Why Auronix"
          title="Built for modern commerce."
          description="The principles that guide how we operate, evaluate opportunities, and build partnerships."
        />
        <StaggerGroup className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {WHY_AURONIX.map((item) => (
            <StaggerItem key={item.title}>
              <div className="group h-full bg-card p-8 hover:bg-secondary/50 transition-colors">
                <div className="text-[11px] font-mono text-accent mb-4 tracking-wider">
                  {String(WHY_AURONIX.indexOf(item) + 1).padStart(2, '0')}
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-3">{item.title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{item.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* SUPPLIER CTA */}
      <SupplierCTA />

      {/* FINAL CTA */}
      <CTASection
        title="Let's build what's next."
        description="Whether you are a supplier looking for a marketplace partner or a brand seeking distribution expertise, we would like to hear from you."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}

function ProcessSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Section className="border-t border-border">
      <SectionHeading
        eyebrow="Process"
        title="From supplier to marketplace, with precision."
        description="A structured path that turns opportunity into marketplace performance."
      />

      {/* Desktop horizontal timeline */}
      <div className="hidden lg:block mt-16">
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-7 left-0 right-0 h-px bg-border" />
          <motion.div
            className="absolute top-7 left-0 h-px bg-accent"
            initial={{ width: '0%' }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 1.5, ease: 'easeInOut' }}
          />

          <div className="grid grid-cols-5 gap-4">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center mb-5 relative z-10">
                  <span className="text-sm font-semibold text-foreground-muted">{step.number}</span>
                </div>
                <h3 className="text-base font-semibold tracking-tight mb-2">{step.title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile vertical timeline */}
      <div className="lg:hidden mt-12 space-y-8">
        {PROCESS_STEPS.map((step, i) => (
          <Reveal key={step.number} delay={i * 0.05}>
            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-foreground-muted">{step.number}</span>
                </div>
                {i < PROCESS_STEPS.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="pb-2">
                <h3 className="text-base font-semibold tracking-tight mb-2">{step.title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{step.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function SupplierCTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-primary py-24 lg:py-32">
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary-foreground/5"
        />
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
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
            We are interested in connecting with legitimate suppliers, distributors, manufacturers,
            wholesalers, and quality brands.
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
