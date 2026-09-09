"use client";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Store,
  Handshake,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/reveal";
import { CommerceFlow } from "@/components/site/commerce-flow";
import { CTASection } from "@/components/site/cta-section";
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from "@/lib/constants";
import { FeatureCard } from "@/components/design/primitives";
import { Timeline, SupplierJourney } from "@/components/design/journey";
const ICON_MAP = { Search, Store, Handshake, Truck };
export default function HomePage() {
  return (
    <SiteLayout>
      <section className="ac-home-hero">
        <div className="ac-container">
          <div className="ac-hero-layout">
            <div>
              <span className="ac-eyebrow">Auronix Commerce LLC</span>
              <h1>Powering the next generation of commerce.</h1>
              <p>
                Auronix Commerce LLC connects quality suppliers, brands, and
                online marketplaces through smarter procurement, distribution,
                and e-commerce operations.
              </p>
              <div className="ac-hero-actions">
                <Link href="/contact" className="ac-button">
                  Partner With Us <ArrowRight size={17} />
                </Link>
                <Link
                  href="/our-process"
                  className="ac-button ac-button-secondary"
                >
                  Explore Our Process <ArrowRight size={17} />
                </Link>
              </div>
            </div>
            <Reveal>
              <CommerceFlow />
            </Reveal>
          </div>
          <div className="ac-hero-foot">
            <span>Procurement · Distribution · Marketplace Operations</span>
            <Link href="/company-verification">
              <ShieldCheck size={17} /> Company Verification{" "}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <Section className="border-t border-border">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-24">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
              Commerce built around better connections.
            </h2>
          </Reveal>
          <Reveal>
            <div className="space-y-5">
              <p className="text-lg leading-relaxed text-foreground-muted">
                Auronix operates at the intersection of procurement, marketplace
                operations, and distribution. We work with suppliers and brands
                to move quality products through the right channels Ã¢â‚¬â€
                efficiently, profitably, and with the operational discipline
                that modern commerce demands.
              </p>
              <p className="text-lg leading-relaxed text-foreground-muted">
                Our approach is structured: we evaluate every opportunity, build
                relationships with the right partners, and manage the full
                lifecycle from sourcing to marketplace performance.
              </p>
              <Link
                href="/about"
                className="inline-flex gap-3 items-center text-sm font-semibold"
              >
                Learn more about Auronix <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
      <Section className="bg-background-subtle">
        <SectionHeading
          eyebrow="Capabilities"
          title="What we do."
          description="Four core capabilities that define how Auronix creates value across the commerce lifecycle."
        />
        <StaggerGroup className="ac-capabilities mt-12 mb-8">
          {CAPABILITIES.map((cap, i) => {
            const Icon = ICON_MAP[cap.icon as keyof typeof ICON_MAP];
            return (
              <StaggerItem key={cap.title}>
                <FeatureCard
                  title={cap.title}
                  description={cap.description}
                  index={i}
                  icon={<Icon size={26} strokeWidth={1.4} />}
                />
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Section>
      <Section>
        <SectionHeading
          eyebrow="Process"
          title="From supplier to marketplace, with precision."
          description="A structured path that turns opportunity into marketplace performance."
        />
        <div className="mt-12">
          <Timeline steps={PROCESS_STEPS} />
        </div>
      </Section>
      <Section className="bg-background-subtle">
        <SectionHeading
          eyebrow="Why Auronix"
          title="Built for modern commerce."
          description="The principles that guide how we operate, evaluate opportunities, and build partnerships."
        />
        <div className="ac-principles">
          {WHY_AURONIX.map((item, i) => (
            <article key={item.title}>
              <span className="ac-index">{String(i + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>
      <section className="ac-supplier-section">
        <div className="ac-supplier-layout">
          <div>
            <span className="ac-eyebrow">For Suppliers</span>
            <h2>Have products that belong in the marketplace?</h2>
            <p>
              We are interested in connecting with legitimate suppliers,
              distributors, manufacturers, wholesalers, and quality brands.
            </p>
            <Link href="/supplier" className="ac-button">
              Become a Supplier <ArrowRight size={17} />
            </Link>
          </div>
          <SupplierJourney />
        </div>
      </section>
      <CTASection
        title="Let's build what's next."
        description="Whether you are a supplier looking for a marketplace partner or a brand seeking distribution expertise, we would like to hear from you."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
