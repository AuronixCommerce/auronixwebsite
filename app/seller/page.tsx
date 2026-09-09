'use client';

import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { CTASection } from '@/components/site/cta-section';
import Link from 'next/link';
import { ArrowRight, Store, ShieldCheck, TrendingUp, Users, ClipboardCheck, UserRoundCheck } from 'lucide-react';

export default function SellerLandingPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Seller Portal"
        title={<>Build your business with Auronix.</>}
        description="Choose the right path: existing approved sellers can sign in, while new businesses can submit a seller application."
      />

      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12">
          <Reveal>
            <Link href="/seller/apply">
              <div className="group ac-content-panel p-10 h-full hover:shadow-premium-lg transition-all">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-6 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                  <Store className="w-6 h-6 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Create Seller Account</h2>
                <p className="text-base text-foreground-muted leading-relaxed mb-6">
                  New to Auronix? Submit your business application. After approval, you will receive a secure one-time account creation link.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:gap-3 transition-all">
                  Apply for an Account
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <Link href="/seller/login">
              <div className="group ac-content-panel p-10 h-full hover:shadow-premium-lg transition-all">
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

      <Section className="border-t border-border">
        <Reveal>
          <div className="rounded-3xl border border-border bg-card p-7 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Seller access</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">A clear, secure path into your workspace.</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { icon: ClipboardCheck, title: '1. Apply', text: 'Provide your verified business and contact information.' },
                { icon: UserRoundCheck, title: '2. Get approved', text: 'Auronix reviews the application and sends a secure invitation.' },
                { icon: ShieldCheck, title: '3. Sign in', text: 'Create your password once, then use Seller Login for future access.' },
              ].map((step) => {
                const Icon = step.icon;
                return <div key={step.title} className="rounded-2xl border border-border bg-background p-5"><Icon className="h-5 w-5 text-accent" /><h3 className="mt-4 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-foreground-muted">{step.text}</p></div>;
              })}
            </div>
          </div>
        </Reveal>
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
                <div className="ac-content-panel p-8 h-full">
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
