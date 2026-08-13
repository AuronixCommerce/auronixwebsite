'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { LoadingState, ErrorState, EmptyState } from '@/components/site/states';
import { auth } from '@/lib/firebase';
import { getData } from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, PartnerPortalData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Package, LifeBuoy, TrendingUp, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PartnerPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<PartnerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      try {
        const profile = await getData<UserProfile>(`users/${firebaseUser.uid}`);
        if (!profile || (profile.role !== 'partner' && profile.role !== 'admin')) {
          setAuthChecked(true);
          setLoading(false);
          return;
        }
        setUser(profile);
        if (profile.partnerId) {
          const portalData = await getData<PartnerPortalData>(`partnerPortals/${profile.partnerId}`);
          setData(portalData);
        }
      } catch {}
      setAuthChecked(true);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return <SiteLayout><Section className="pt-32"><LoadingState /></Section></SiteLayout>;

  if (!authChecked || !user) {
    return (
      <SiteLayout>
        <PageHeader eyebrow="Partner Portal" title={<>Partner Portal"} description="Access your partner resources and information." />
        <Section className="border-t border-border">
          <Reveal className="max-w-md mx-auto text-center">
            <div className="rounded-2xl border border-border bg-card p-8">
              <ShieldCheck className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
              <p className="text-sm text-foreground-muted mb-6">You need to be signed in as an authorized partner to access this portal.</p>
              <Link href="/contact"><Button>Contact Us</Button></Link>
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
        {/* Status */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">Partnership Status</p>
              <p className="text-lg font-semibold">{data?.status || 'Active'}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse-soft" />
          </div>
        </div>

        {/* Overview */}
        {data?.overview && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-3">Overview</h2>
            <p className="text-sm text-foreground-muted leading-relaxed">{data.overview}</p>
          </div>
        )}

        {/* Resources */}
        {data?.resources && data.resources.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Resources</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.resources.map((r, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-2">{r.title}</h3>
                  <p className="text-sm text-foreground-muted mb-3">{r.description}</p>
                  {r.url && <a href={r.url} className="text-sm text-accent hover:underline">{r.url}</a>}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Documents */}
        {data?.documents && data.documents.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Documents</h2>
            <div className="space-y-2">
              {data.documents.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <FileText className="w-5 h-5 text-foreground-muted" />
                  <span className="text-sm flex-1">{d.name}</span>
                  <a href={d.url} className="text-sm text-accent hover:underline">View</a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Catalogs */}
        {data?.catalogs && data.catalogs.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Catalogs</h2>
            <div className="space-y-2">
              {data.catalogs.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <Package className="w-5 h-5 text-foreground-muted" />
                  <span className="text-sm flex-1">{c.name}</span>
                  <a href={c.url} className="text-sm text-accent hover:underline">View</a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!data && (
          <EmptyState
            title="No portal data available yet."
            description="Your partner resources will appear here once they are configured. Contact us if you need assistance."
          />
        )}
      </Section>
    </SiteLayout>
  );
}
