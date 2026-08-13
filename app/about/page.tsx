import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { Target, Layers, Workflow, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Auronix Commerce LLC',
  description:
    'Auronix Commerce LLC is a modern commerce company focused on procurement, supplier relationships, distribution, and marketplace operations.',
  alternates: { canonical: '/about' },
};

const SECTIONS = [
  {
    icon: Target,
    label: 'Who We Are',
    title: 'A commerce company built on operational discipline.',
    body: 'Auronix Commerce LLC is a U.S. commerce technology company. We exist to make the path from supplier to marketplace more efficient, more transparent, and more reliable. We are not a reseller or a middleman — we are an operations partner that manages the complexity of modern commerce so our suppliers and partners can focus on what they do best: building quality products.',
  },
  {
    icon: Layers,
    label: 'What We Do',
    title: 'Procurement, marketplace operations, and distribution — managed end to end.',
    body: 'We evaluate product opportunities, establish supplier relationships, prepare catalogs, manage marketplace listings, coordinate logistics, and optimize performance over time. Our work spans the full commerce lifecycle, from the first conversation with a supplier to the ongoing performance of a product in the marketplace.',
  },
  {
    icon: Workflow,
    label: 'How We Work',
    title: 'Structured processes, not guesswork.',
    body: 'Every engagement follows a defined process: discover, evaluate, source, prepare, launch, optimize, and scale. We measure what matters, we communicate clearly, and we hold ourselves to a high standard. Our approach is repeatable — which is how we deliver consistent results across categories and marketplaces.',
  },
  {
    icon: ShieldCheck,
    label: 'What We Value',
    title: 'Quality, transparency, and long-term partnerships.',
    body: 'We believe that quality is what sustains marketplace performance. We believe that transparency builds trust. And we believe that long-term partnerships create more value than short-term transactions. These values are not aspirational — they are embedded in how we evaluate, source, and operate every day.',
  },
];

export default function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="About"
        title={<>Built for the next era of commerce.</>}
        description="Auronix Commerce LLC is a modern commerce company focused on procurement, supplier relationships, distribution, and marketplace operations."
      />

      {/* Narrative sections */}
      <Section className="border-t border-border">
        <div className="space-y-20 lg:space-y-32">
          {SECTIONS.map((section, i) => {
            const Icon = section.icon;
            const isReversed = i % 2 === 1;
            return (
              <div
                key={section.label}
                className={`grid lg:grid-cols-12 gap-8 lg:gap-16 items-start ${
                  isReversed ? 'lg:[direction:rtl]' : ''
                }`}
              >
                <Reveal className={`lg:col-span-5 ${isReversed ? 'lg:[direction:ltr]' : ''}`}>
                  <div className="sticky top-24">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
                      {section.label}
                    </span>
                    <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15] text-balance">
                      {section.title}
                    </h2>
                  </div>
                </Reveal>
                <Reveal
                  delay={0.1}
                  className={`lg:col-span-7 ${isReversed ? 'lg:[direction:ltr]' : ''}`}
                >
                  <p className="text-lg lg:text-xl text-foreground-muted leading-relaxed">
                    {section.body}
                  </p>
                </Reveal>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Values grid */}
      <Section className="border-t border-border bg-background-subtle">
        <SectionHeading
          eyebrow="Principles"
          title="What guides our work."
          description="The principles that shape every decision we make."
        />
        <StaggerGroup className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: 'Quality First', description: 'We never compromise on quality for short-term gain. Quality is what sustains performance.' },
            { title: 'Operational Discipline', description: 'Every decision is grounded in process. We measure, we refine, we hold ourselves accountable.' },
            { title: 'Long-Term Thinking', description: 'We invest in relationships and strategies that create value over years, not days.' },
            { title: 'Transparency', description: 'Clear communication and honest assessment. Our partners always know where things stand.' },
            { title: 'Marketplace Expertise', description: 'Deep understanding of how marketplaces work, what drives visibility, and what converts.' },
            { title: 'Structured Process', description: 'From discovery to scale, every phase follows a defined, repeatable process.' },
          ].map((item) => (
            <StaggerItem key={item.title}>
              <div className="rounded-2xl border border-border bg-card p-7 h-full hover:shadow-premium transition-shadow">
                <h3 className="text-lg font-semibold tracking-tight mb-3">{item.title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{item.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <CTASection
        title="Let's build what's next."
        description="Whether you are a supplier looking for a marketplace partner or a brand seeking distribution expertise, we would like to hear from you."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
