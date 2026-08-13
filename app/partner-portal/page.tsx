'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/site/states';
import { getData } from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, PartnerPortalData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Package, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PartnerPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<PartnerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      try {
        setLoading(true);
        setError(null);

        if (!firebaseUser) {
          setUser(null);
          setData(null);
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        const profile = await getData<UserProfile>(
          `users/${firebaseUser.uid}`
        );

        if (
          !profile ||
          (profile.role !== 'partner' && profile.role !== 'admin')
        ) {
          setUser(null);
          setData(null);
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        setUser(profile);

        if (profile.partnerId) {
          const portalData = await getData<PartnerPortalData>(
            `partnerPortals/${profile.partnerId}`
          );

          setData(portalData ?? null);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('Partner portal error:', err);
        setError(
          'We could not load your partner portal. Please try again later.'
        );
        setUser(null);
        setData(null);
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <SiteLayout>
        <Section className="pt-32">
          <LoadingState />
        </Section>
      </SiteLayout>
    );
  }

  if (error) {
    return (
      <SiteLayout>
        <PageHeader
          eyebrow="Partner Portal"
          title={<>Partner Portal</>}
          description="Access your partner resources and information."
        />

        <Section className="border-t border-border">
          <Reveal className="max-w-md mx-auto">
            <ErrorState
              title="Unable to load portal"
              description={error}
            />
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  if (!authChecked || !user) {
    return (
      <SiteLayout>
        <PageHeader
          eyebrow="Partner Portal"
          title={<>Partner Portal</>}
          description="Access your partner resources and information."
        />

        <Section className="border-t border-border">
          <Reveal className="max-w-md mx-auto text-center">
            <div className="rounded-2xl border border-border bg-card p-8">
              <ShieldCheck className="w-12 h-12 text-foreground-muted mx-auto mb-4" />

              <h2 className="text-lg font-semibold mb-2">
                Authentication Required
              </h2>

              <p className="text-sm text-foreground-muted mb-6">
                You need to be signed in as an authorized partner to access
                this portal.
              </p>

              <Link href="/contact">
                <Button>Contact Us</Button>
              </Link>
            </div>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Partner Portal"
        title={<>Welcome, {user.displayName || user.email}.</>}
        description="Your partner resources, documents, and status."
      />

      <Section className="border-t border-border">
        {/* Partnership Status */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">
                Partnership Status
              </p>

              <p className="text-lg font-semibold">
                {data?.status || 'Active'}
              </p>
            </div>

            <div
              className="w-3 h-3 rounded-full bg-green-500 animate-pulse-soft"
              aria-label="Active"
              title="Active"
            />
          </div>
        </div>

        {/* Overview */}
        {data?.overview && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-3">
              Overview
            </h2>

            <p className="text-sm text-foreground-muted leading-relaxed">
              {data.overview}
            </p>
          </div>
        )}

        {/* Resources */}
        {data?.resources && data.resources.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Resources
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {data.resources.map((resource, index) => (
                <div
                  key={`${resource.title}-${index}`}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h3 className="text-sm font-semibold mb-2">
                    {resource.title}
                  </h3>

                  <p className="text-sm text-foreground-muted mb-3">
                    {resource.description}
                  </p>

                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline break-all"
                    >
                      {resource.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {data?.documents && data.documents.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Documents
            </h2>

            <div className="space-y-2">
              {data.documents.map((document, index) => (
                <div
                  key={`${document.name}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <FileText className="w-5 h-5 text-foreground-muted shrink-0" />

                  <span className="text-sm flex-1 min-w-0 truncate">
                    {document.name}
                  </span>

                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline shrink-0"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalogs */}
        {data?.catalogs && data.catalogs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Catalogs
            </h2>

            <div className="space-y-2">
              {data.catalogs.map((catalog, index) => (
                <div
                  key={`${catalog.name}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <Package className="w-5 h-5 text-foreground-muted shrink-0" />

                  <span className="text-sm flex-1 min-w-0 truncate">
                    {catalog.name}
                  </span>

                  <a
                    href={catalog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline shrink-0"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data && (
          <EmptyState
            title="No portal data available yet."
            description="Your partner resources will appear here once they are configured. Contact us if you need assistance."
          />
        )}

        {/* Partial data but no visible content */}
        {data &&
          !data.overview &&
          (!data.resources || data.resources.length === 0) &&
          (!data.documents || data.documents.length === 0) &&
          (!data.catalogs || data.catalogs.length === 0) && (
            <EmptyState
              title="Your portal is ready."
              description="Your partner resources have not been added yet. Contact Auronix if you need assistance."
            />
          )}
      </Section>
    </SiteLayout>
  );
}
