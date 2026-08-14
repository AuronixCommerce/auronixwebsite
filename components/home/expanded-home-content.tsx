'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Handshake,
  Layers3,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

const processSteps = [
  {
    number: '01',
    title: 'Supplier Catalog',
    description:
      'Suppliers share catalogs, product information, and wholesale opportunities with Auronix.',
    icon: Package,
  },
  {
    number: '02',
    title: 'Product Evaluation',
    description:
      'We evaluate products based on fit, quality, commercial potential, and marketplace suitability.',
    icon: Search,
  },
  {
    number: '03',
    title: 'Inventory Purchase',
    description:
      'We select qualified opportunities and purchase inventory from approved suppliers.',
    icon: ShoppingBag,
  },
  {
    number: '04',
    title: 'Marketplace Distribution',
    description:
      'Selected products are prepared and distributed through major online marketplaces.',
    icon: Store,
  },
  {
    number: '05',
    title: 'Customer Reach',
    description:
      'Products reach consumers through established eCommerce channels across the U.S.',
    icon: Users,
  },
];

const marketplaceCards = [
  {
    title: 'Amazon',
    subtitle: 'Major marketplace reach',
    description:
      'Selected products can be positioned for distribution through one of the largest online marketplaces.',
    icon: ShoppingBag,
  },
  {
    title: 'Walmart',
    subtitle: 'Broad consumer access',
    description:
      'Marketplace distribution designed to help qualified products reach established consumer demand.',
    icon: Store,
  },
  {
    title: 'eBay',
    subtitle: 'Flexible marketplace channel',
    description:
      'An additional established channel for selected products and categories.',
    icon: Globe2,
  },
  {
    title: 'Other Channels',
    subtitle: 'Expanded opportunities',
    description:
      'We evaluate additional channels based on product suitability and commercial potential.',
    icon: Layers3,
  },
];

const strengths = [
  {
    title: 'Direct Purchasing',
    description:
      'We evaluate qualified products for direct inventory purchasing opportunities.',
    icon: ShoppingBag,
  },
  {
    title: 'Marketplace Distribution',
    description:
      'Selected products can be distributed through established online marketplaces.',
    icon: Globe2,
  },
  {
    title: 'Professional Operations',
    description:
      'We approach sourcing, purchasing, logistics coordination, and marketplace operations with structured processes.',
    icon: Zap,
  },
  {
    title: 'Responsive Communication',
    description:
      'We value clear communication and timely coordination throughout the supplier relationship.',
    icon: Handshake,
  },
  {
    title: 'Long-Term Relationships',
    description:
      'We aim to build reliable relationships with suppliers and brands rather than pursue one-off transactions.',
    icon: Users,
  },
  {
    title: 'Commercial Focus',
    description:
      'We look for products with a strong combination of quality, supplier fit, and marketplace potential.',
    icon: CheckCircle2,
  },
];

const categories = [
  {
    title: 'Electronics',
    description:
      'Consumer electronics and accessories suitable for online marketplace distribution.',
    icon: Zap,
  },
  {
    title: 'Home & Kitchen',
    description:
      'Practical household products with strong consumer applications.',
    icon: Building2,
  },
  {
    title: 'Health & Beauty',
    description:
      'Selected personal care and wellness-oriented consumer products.',
    icon: Sparkles,
  },
  {
    title: 'Sports & Outdoors',
    description:
      'Products designed for active lifestyles, recreation, and outdoor use.',
    icon: Globe2,
  },
  {
    title: 'Office Supplies',
    description:
      'Everyday office, workspace, and productivity products.',
    icon: Layers3,
  },
  {
    title: 'General Merchandise',
    description:
      'Selected products across additional consumer categories.',
    icon: Package,
  },
];

const businessDetails = [
  ['Business Name', 'Auronix Commerce LLC'],
  ['Entity Type', 'Limited Liability Company (LLC)'],
  ['Registered In', 'Florida, United States'],
  ['Company Status', 'Active'],
  ['Document Number', 'L26000406922'],
  ['Formation Date', 'August 3, 2026'],
];

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="max-w-3xl mb-12 lg:mb-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-4"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {eyebrow}
        </span>
      </motion.div>

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05] text-balance">
        {title}
      </h2>

      <p className="mt-5 text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl">
        {description}
      </p>
    </div>
  );
}

export function ExpandedHomeContent() {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden">

      {/* Strategic Sourcing */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Strategic Sourcing"
              title={
                <>
                  Built for
                  <span className="text-foreground-muted">
                    {' '}modern marketplaces.
                  </span>
                </>
              }
              description="We connect selected supplier products with established online marketplaces, creating opportunities for products to reach customers where they already shop."
            />
          </Reveal>

          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8">
            <Reveal delay={0.05}>
              <div className="relative h-full rounded-[28px] border border-border bg-card overflow-hidden p-7 sm:p-9">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-foreground-muted">
                        Auronix Marketplace Distribution
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        Strategic sourcing.
                      </div>
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <Globe2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {marketplaceCards.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <motion.div
                          key={item.title}
                          initial={
                            reduce
                              ? false
                              : { opacity: 0, x: -18 }
                          }
                          whileInView={
                            reduce
                              ? undefined
                              : { opacity: 1, x: 0 }
                          }
                          viewport={{
                            once: true,
                            margin: '-80px',
                          }}
                          transition={{
                            duration: 0.55,
                            delay: index * 0.08,
                          }}
                          className="group rounded-2xl border border-border bg-background/50 p-5 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Icon className="w-5 h-5 text-foreground-muted" />
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold">
                                {item.title}
                              </div>

                              <div className="text-xs text-accent mt-0.5">
                                {item.subtitle}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 ml-auto text-foreground-muted group-hover:translate-x-1 transition-transform" />
                          </div>

                          <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                            {item.description}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6">
              <Reveal delay={0.1}>
                <div className="rounded-[28px] border border-border bg-card p-7 sm:p-8 h-full">
                  <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold">
                    From inventory to customer reach.
                  </h3>

                  <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                    We coordinate the commercial path from qualified
                    supplier opportunities through purchasing and
                    marketplace distribution.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.16}>
                <div className="rounded-[28px] border border-border bg-card p-7 sm:p-8 h-full">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold">
                    U.S. business. Marketplace focus.
                  </h3>

                  <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                    Auronix Commerce LLC operates as a Florida-registered
                    U.S. business focused on eCommerce and marketplace
                    distribution opportunities.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="relative py-24 lg:py-32 bg-background-subtle border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Our Process"
              title={
                <>
                  From supplier catalog
                  <span className="text-foreground-muted">
                    {' '}to marketplace.
                  </span>
                </>
              }
              description="A structured process turns a product opportunity into a marketplace-ready operation."
            />
          </Reveal>

          <div className="relative">
            <div className="hidden lg:block absolute left-[10%] right-[10%] top-[74px] h-px bg-border" />

            <div className="grid lg:grid-cols-5 gap-5">
              {processSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <Reveal
                    key={step.number}
                    delay={index * 0.06}
                    className="h-full"
                  >
                    <motion.div
                      whileHover={
                        reduce
                          ? undefined
                          : {
                              y: -8,
                            }
                      }
                      className="relative h-full rounded-[24px] border border-border bg-card p-6 hover:shadow-premium-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-accent">
                          {step.number}
                        </span>

                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                          <Icon className="w-5 h-5 text-foreground-muted" />
                        </div>
                      </div>

                      <h3 className="mt-7 text-lg font-semibold tracking-tight">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                        {step.description}
                      </p>

                      <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                    </motion.div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Why Auronix */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Why Work With Auronix"
              title={
                <>
                  A straightforward partner
                  <span className="text-foreground-muted">
                    {' '}for marketplace distribution.
                  </span>
                </>
              }
              description="Our operating approach focuses on qualified products, clear communication, disciplined purchasing, and sustainable supplier relationships."
            />
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {strengths.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal
                  key={item.title}
                  delay={(index % 3) * 0.07}
                  className="h-full"
                >
                  <motion.div
                    whileHover={
                      reduce
                        ? undefined
                        : {
                            y: -7,
                            scale: 1.01,
                          }
                    }
                    className="h-full rounded-[24px] border border-border bg-card p-6 sm:p-7 hover:shadow-premium-lg transition-shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground-muted" />
                    </div>

                    <h3 className="mt-6 text-lg font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product categories */}
      <section className="relative py-24 lg:py-32 bg-background-subtle border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Product Categories"
              title={
                <>
                  Products
                  <span className="text-foreground-muted">
                    {' '}we source.
                  </span>
                </>
              }
              description="We evaluate opportunities across a range of consumer categories, with product selection based on supplier fit, product quality, marketplace suitability, and commercial potential."
            />
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category, index) => {
              const Icon = category.icon;

              return (
                <Reveal
                  key={category.title}
                  delay={(index % 3) * 0.07}
                >
                  <motion.div
                    whileHover={
                      reduce
                        ? undefined
                        : {
                            rotateX: 2,
                            rotateY: -2,
                            y: -6,
                          }
                    }
                    className="group rounded-[26px] border border-border bg-card p-7 min-h-[220px] hover:shadow-premium-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5 text-foreground-muted" />
                      </div>

                      <span className="text-[10px] font-mono text-foreground-muted">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-8 text-xl font-semibold tracking-tight">
                      {category.title}
                    </h3>

                    <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
                      {category.description}
                    </p>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Company verification */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-8">
            <Reveal>
              <div className="h-full rounded-[28px] border border-border bg-card p-8 sm:p-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                      U.S. Business
                    </div>

                    <div className="text-xl font-semibold">
                      Auronix Commerce LLC
                    </div>
                  </div>
                </div>

                <p className="mt-7 text-sm sm:text-base text-foreground-muted leading-relaxed">
                  Auronix Commerce LLC is an active limited liability
                  company registered in the State of Florida, United States.
                </p>

                <Link
                  href="/company-verification"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium"
                >
                  Verify Company
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-[28px] border border-border bg-card p-8 sm:p-10">
                <div className="grid sm:grid-cols-2 gap-4">
                  {businessDetails.map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-secondary/60 p-5"
                      >
                        <div className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">
                          {label}
                        </div>

                        <div className="mt-2 text-sm font-medium">
                          {value}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Supplier CTA */}
      <section className="relative py-24 lg:py-32 border-t border-border">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border border-border bg-card p-8 sm:p-12 lg:p-16 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 pointer-events-none" />

              <motion.div
                animate={
                  reduce
                    ? undefined
                    : {
                        scale: [1, 1.04, 1],
                        opacity: [0.3, 0.5, 0.3],
                      }
                }
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute w-64 h-64 rounded-full bg-accent/10 blur-3xl -top-24 -right-20"
              />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-foreground-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Supplier Partnerships
                </div>

                <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                  Have a catalog
                  <br />
                  <span className="text-foreground-muted">
                    we'd like to review?
                  </span>
                </h2>

                <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-foreground-muted leading-relaxed">
                  If you are a supplier, brand, or distributor with
                  products suitable for online marketplaces, share your
                  catalog with our team.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                  <Link
                    href="/become-a-supplier"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium"
                  >
                    Submit Your Catalog
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-secondary"
                  >
                    Contact Our Team
                  </Link>
                </div>

                <div className="mt-8 text-xs text-foreground-muted">
                  We review submitted product information and contact
                  qualified suppliers regarding potential opportunities.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
