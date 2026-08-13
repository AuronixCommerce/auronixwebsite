import type { Metadata } from 'next';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import { WHY_WORK } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Why Work With Us',
  description:
    'A better way to build commerce partnerships. Professional communication, quality-first thinking, structured operations, marketplace knowledge, and long-term relationships.',
  alternates: { canonical: '/why-work-with-us' },
};

export default function WhyWorkWithUsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Why Auronix"
        title={<>A better way to build commerce partnerships.</>}
        description="We believe that commerce partnerships should be built on communication, quality, and shared goals — not transactions."
      />

      {/* Editorial sections */}
      <Section className="border-t border-border">
        <div className="space-y-16 lg:space-y-24">
          {WHY_WORK.map((item, i) => (
            <Reveal key={item.title}>
              <div
                className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-start ${
                  i % 2 === 1 ? 'lg:[direction:rtl]' : ''
                }`}
              >
                <div className={`lg:col-span-4 ${i % 2 === 1 ? 'lg:[direction:ltr]' : ''}`}>
                  <span className="text-[64px] lg:text-[80px] font-semibold tracking-tighter text-border-strong leading-none block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className={`lg:col-span-8 ${i % 2 === 1 ? 'lg:[direction:ltr]' : ''}`}>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15] mb-5 text-balance">
                    {item.title}
                  </h2>
                  <p className="text-lg lg:text-xl text-foreground-muted leading-relaxed max-w-2xl">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Summary grid */}
      <Section className="border-t border-border bg-background-subtle">
        <SectionHeading
          eyebrow="Summary"
          title="Six reasons partners choose Auronix."
        />
        <StaggerGroup className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHY_WORK.map((item) => (
            <StaggerItem key={item.title}>
              <div className="rounded-2xl border border-border bg-card p-7 h-full">
                <h3 className="text-base font-semibold tracking-tight mb-3">{item.title}</h3>
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
