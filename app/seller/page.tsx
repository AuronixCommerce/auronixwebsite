'use client';

import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import Link from 'next/link';
import { ArrowRight, Store, ShieldCheck, TrendingUp, Users } from 'lucide-react';

export default function SellerLandingPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Seller Portal"
        title={<>Build your business with Auronix.</>}
        description="Join the Auronix seller network. Apply to become a seller and gain access to tools, resources, and partnership opportunities."
      />

      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12">
          <Reveal>
            <Link href="/seller/apply">
              <div className="group rounded-2xl border border-border bg-card p-10 h-full hover:shadow-premium-lg transition-all">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-6 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                  <Store className="w-6 h-6 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Apply to Become a Seller</h2>
                <p className="text-base text-foreground-muted leading-relaxed mb-6">
                  Submit your application to join the Auronix seller network. Tell us about your business and products.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:gap-3 transition-all">
                  Start Application
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <Link href="/seller/login">
              <div className="group rounded-2xl border border-border bg-card p-10 h-full hover:shadow-premium-lg transition-all">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-6 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Seller Login</h2>
                <p className="text-base text-foreground-muted leading-relaxed mb-6">
                  Already approved? Log in to your seller dashboard to manage your profile, products, and support tickets.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:gap-3 transition-all">
                  Login to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </Section>

      {/* Benefits */}
      <Section className="border-t border-border bg-background-subtle">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: TrendingUp, title: 'Growth Opportunities', description: 'Access marketplace channels and distribution capabilities to grow your business.' },
            { icon: Users, title: 'Partnership Network', description: 'Connect with a network of suppliers, brands, and marketplace operators.' },
            { icon: ShieldCheck, title: 'Secure Platform', description: 'Your data and communications are protected with enterprise-grade security.' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-8 h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight mb-3">{item.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <CTASection
        title="Ready to get started?"
        description="Submit your application today and our team will review it promptly."
        buttonText="Apply Now"
        buttonHref="/seller/apply"
      />
    </SiteLayout>
  );
}
