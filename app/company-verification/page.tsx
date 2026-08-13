'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { LoadingState, ErrorState } from '@/components/site/states';
import { getData } from '@/lib/firebase-db';
import type { CompanySettings } from '@/lib/types';
import { COMPANY } from '@/lib/constants';
import { Building2, FileText, Scale, Mail, ShieldCheck } from 'lucide-react';

export default function CompanyVerificationPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getData<CompanySettings>('site/settings')
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const companyInfo = settings?.businessInfo;
  const contactEmail = settings?.contactEmail || COMPANY.email;
  const phone = settings?.phone || '';

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Company Verification"
        title={<>Verify Auronix Commerce LLC.</>}
        description="This page provides verified company information about Auronix Commerce LLC. We believe in transparency and making our business details accessible."
      />

      <Section className="border-t border-border">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 gap-5 max-w-4xl">
            {/* Company Information */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">Company Information</h2>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Company Name</dt>
                    <dd className="text-sm text-foreground mt-1">{COMPANY.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Tagline</dt>
                    <dd className="text-sm text-foreground mt-1">{settings?.tagline || 'Modern commerce operations'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Description</dt>
                    <dd className="text-sm text-foreground mt-1">{COMPANY.description}</dd>
                  </div>
                </dl>
              </div>
            </StaggerItem>

            {/* Business Details */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                    <FileText className="w-5 h-5 text-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">Business Details</h2>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Legal Name</dt>
                    <dd className="text-sm text-foreground mt-1">{companyInfo?.legalName || COMPANY.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Entity Type</dt>
                    <dd className="text-sm text-foreground mt-1">{companyInfo?.entityType || 'Limited Liability Company (LLC)'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">State</dt>
                    <dd className="text-sm text-foreground mt-1">{companyInfo?.state || 'United States'}</dd>
                  </div>
                </dl>
                <p className="text-xs text-foreground-muted mt-6 leading-relaxed">
                  Additional registration details are available upon verified request.
                </p>
              </div>
            </StaggerItem>

            {/* Legal Information */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                    <Scale className="w-5 h-5 text-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">Legal Information</h2>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Legal Documents</dt>
                    <dd className="text-sm text-foreground mt-1">
                      <ul className="space-y-2 mt-1">
                        <li>
                          <a href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</a>
                        </li>
                        <li>
                          <a href="/terms" className="hover:text-accent transition-colors">Terms of Service</a>
                        </li>
                        <li>
                          <a href="/disclaimer" className="hover:text-accent transition-colors">Disclaimer</a>
                        </li>
                        <li>
                          <a href="/cookie-policy" className="hover:text-accent transition-colors">Cookie Policy</a>
                        </li>
                      </ul>
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-foreground-muted mt-6 leading-relaxed">
                  Specific registration numbers, EIN, or licenses are not published publicly. They are available upon verified request to authorized parties.
                </p>
              </div>
            </StaggerItem>

            {/* Contact Information */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                    <Mail className="w-5 h-5 text-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">Contact Information</h2>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Email</dt>
                    <dd className="text-sm text-foreground mt-1">
                      <a href={`mailto:${contactEmail}`} className="hover:text-accent transition-colors">{contactEmail}</a>
                    </dd>
                  </div>
                  {phone && (
                    <div>
                      <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Phone</dt>
                      <dd className="text-sm text-foreground mt-1">{phone}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Website</dt>
                    <dd className="text-sm text-foreground mt-1">{COMPANY.website}</dd>
                  </div>
                </dl>
              </div>
            </StaggerItem>
          </StaggerGroup>
        )}
      </Section>

      {/* Verification note */}
      <Section className="border-t border-border bg-background-subtle">
        <Reveal className="max-w-3xl">
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-8">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight mb-2">About this information</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                The information on this page represents verified company details for Auronix Commerce LLC.
                We do not publish sensitive registration numbers, EINs, or licenses publicly. If you are an
                authorized party requiring additional verification, please contact us directly.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>
    </SiteLayout>
  );
}
