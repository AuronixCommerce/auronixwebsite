import Link from "next/link";
import { SiteLayout } from "@/components/site/site-layout";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/reveal";
import { CommerceFlow } from "@/components/site/commerce-flow";
import { CTASection } from "@/components/site/cta-section";
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from "@/lib/constants";
import { Timeline, SupplierJourney } from "@/components/design/journey";
export default function HomePage() {
  return (
    <SiteLayout>
      <section className="ac-home-hero">
        <div className="ac-container">
          <div className="ac-home-masthead">
            <span className="ac-eyebrow">Auronix Commerce LLC</span>
            <h1>
              <span className="ac-hero-line">Powering the next generation</span>
              <span className="ac-hero-line ac-hero-accent">of commerce.</span>
            </h1>
          </div>
          <div className="ac-hero-layout">
            <div className="ac-home-brief">
              <p>
                Auronix Commerce LLC connects quality suppliers, brands, and
                online marketplaces through smarter procurement, distribution,
                and e-commerce operations.
              </p>
              <div className="ac-hero-actions">
                <Link href="/contact" className="ac-button">
                  Partner With Us
                </Link>
                <Link
                  href="/our-process"
                  className="ac-button ac-button-secondary"
                >
                  Explore Our Process
                </Link>
              </div>
              <ul className="ac-hero-signals" aria-label="Auronix capabilities">
                <li>Structured procurement</li>
                <li>Marketplace operations</li>
                <li>Supplier partnerships</li>
              </ul>
            </div>
            <Reveal>
              <CommerceFlow />
            </Reveal>
          </div>
          <div className="ac-hero-foot">
            <span>Procurement · Distribution · Marketplace Operations</span>
            <Link href="/company-verification">
              Company Verification
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
                to move quality products through the right channels —
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
                Learn more about Auronix
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
            return (
              <StaggerItem key={cap.title}>
                <article className="ac-feature">
                  <div className="ac-feature-top">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{cap.title}</h3>
                  <p>{cap.description}</p>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Section>
      <Section className="ac-product-proof-section">
        <SectionHeading
          eyebrow="Working tools"
          title="Production tools for every partner stage."
          description="Applicants and approved partners can use the same production workflows that our team reviews and manages."
        />
        <ol className="ac-product-proof">
          <li>
            <span>01</span>
            <div><strong>Track an application</strong><p>Verify the submitted email, review progress, and respond to requested changes.</p></div>
            <Link href="/seller/application/track">Open application tracking</Link>
          </li>
          <li>
            <span>02</span>
            <div><strong>Access the partner workspace</strong><p>Approved partners manage commercial terms, documents, messages, and review history.</p></div>
            <Link href="/partner-portal">Open partner portal</Link>
          </li>
          <li>
            <span>03</span>
            <div><strong>Reach the support team</strong><p>Start a support request with the relevant business context attached.</p></div>
            <Link href="/support">Open support</Link>
          </li>
        </ol>
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
              Become a Supplier
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
