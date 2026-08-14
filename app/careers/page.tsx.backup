'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from '@/components/site/states';
import { subscribeToList } from '@/lib/firebase-db';
import type { JobPosting } from '@/lib/types';
import { CTASection } from '@/components/site/cta-section';
import { MapPin, Briefcase, Clock, ArrowRight } from 'lucide-react';

export default function CareersPage() {
  const [jobs, setJobs] = useState<(JobPosting & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToList<JobPosting>(
      'careers',
      (data) => {
        const active = data.filter((j) => j.status === 'active');
        setJobs(active);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Careers"
        title={<>Build a career in modern commerce.</>}
        description="We are building a team that values quality, discipline, and long-term thinking. If that sounds like you, we would like to hear from you."
      />

      <Section className="border-t border-border">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No open positions at the moment."
            description="We are always interested in connecting with talented people. If you would like to be considered for future opportunities, please reach out."
          />
        ) : (
          <StaggerGroup className="space-y-4">
            {jobs.map((job) => (
              <StaggerItem key={job.id}>
                <div className="group rounded-2xl border border-border bg-card p-7 hover:shadow-premium-lg transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold tracking-tight mb-3">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4" />
                          {job.department}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {job.employmentType}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`mailto:careers@auronix.com?subject=Application: ${encodeURIComponent(job.title)}`}
                      className="group/btn inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors shrink-0"
                    >
                      Apply
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    </a>
                  </div>
                  {job.description && (
                    <p className="mt-4 text-sm text-foreground-muted leading-relaxed">
                      {job.description}
                    </p>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      <CTASection
        title="Don't see the right role?"
        description="We are always interested in connecting with talented people. Reach out and tell us about yourself."
        buttonText="Contact Us"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
