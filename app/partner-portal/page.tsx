'use client';

import { AnimatedNumber, StatusBadge } from '@/components/design/primitives';
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
import { ArrowRight, FileText, LayoutDashboard, LifeBuoy, Package, Settings, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PartnerPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<PartnerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellerWorkspace, setSellerWorkspace] = useState<any>(null);

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
          (profile.role !== 'partner' && profile.role !== 'admin' && profile.role !== 'seller')
        ) {
          setUser(null);
          setData(null);
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        setUser(profile);

        if (profile.role === 'seller') {
          const { sellerWorkspaceRequest } = await import('@/lib/seller-workspace-client');
          setSellerWorkspace(await sellerWorkspaceRequest());
          setData(null);
          return;
        }

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
            <div className="ac-content-panel p-8">
              <ShieldCheck className="w-12 h-12 text-foreground-muted mx-auto mb-4" />

              <h2 className="text-lg font-semibold mb-2">
                Authentication Required
              </h2>

              <p className="text-sm text-foreground-muted mb-6">
                You need to be signed in as an authorized partner to access
                this portal.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center"><Link href="/seller/login"><Button>Seller login</Button></Link><Link href="/seller/apply"><Button variant="outline">Create seller account</Button></Link></div>
            </div>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  if (user.role === 'seller') {
    const application = sellerWorkspace?.application;
    const products = Array.isArray(sellerWorkspace?.products) ? sellerWorkspace.products : [];
    const catalogs = Array.isArray(sellerWorkspace?.catalogs) ? sellerWorkspace.catalogs : [];
    const tickets = Array.isArray(sellerWorkspace?.tickets) ? sellerWorkspace.tickets : [];
    const active = user.status === 'active' && application?.status === 'active';
    return <SiteLayout><PageHeader eyebrow="Seller Partner Portal" title={<>Welcome, {user.displayName || user.name || user.email}.</>} description="A secure launchpad for your Auronix seller workspace, catalog, products, profile, and support." /><Section className="border-t border-border"><div className="mb-6 flex flex-col gap-4 ac-content-panel p-6 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-green-500' : 'bg-amber-500'}`} /><span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">Seller partnership</span></div><h2 className="mt-2 text-xl font-semibold">{active ? 'Account active and connected' : `Status: ${application?.status || user.status || 'pending'}`}</h2><p className="mt-1 text-sm text-foreground-muted">Your portal reads live information from your seller account.</p></div><Link href="/seller/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Open full dashboard <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-3"><PortalMetric icon={Package} label="Products" value={products.length} href="/seller/dashboard/products" /><PortalMetric icon={FileText} label="Catalogs" value={catalogs.length} href="/seller/dashboard/catalogs" /><PortalMetric icon={LifeBuoy} label="Support tickets" value={tickets.length} href="/seller/support" /></div><div className="mt-8"><h2 className="mb-4 text-lg font-semibold">Seller tools</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><PortalAction icon={LayoutDashboard} title="Dashboard" description="See verification and live account status." href="/seller/dashboard" /><PortalAction icon={Package} title="Manage products" description="Add and maintain product drafts." href="/seller/dashboard/products" /><PortalAction icon={FileText} title="Catalog library" description="Connect current product catalogs." href="/seller/dashboard/catalogs" /><PortalAction icon={Settings} title="Account settings" description="Keep business details accurate." href="/seller/settings" /></div></div><div className="mt-8 rounded-2xl border border-accent/20 bg-accent/5 p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><div><h3 className="font-semibold">Need help with your partnership?</h3><p className="mt-1 text-sm leading-6 text-foreground-muted">Create a support ticket connected to your seller account. You can track its current status in real time.</p><Link href="/seller/support" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">Open seller support <ArrowRight className="h-4 w-4" /></Link></div></div></div></Section></SiteLayout>;
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
        <div className="ac-content-panel p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">
                Partnership Status
              </p>

              <p className="text-lg font-semibold">
                <StatusBadge tone={data?.status?.toLowerCase() === 'active' ? 'success' : 'neutral'}>{data?.status || 'Not available'}</StatusBadge>
              </p>
            </div>


          </div>
        </div>

        {/* Overview */}
        {data?.overview && (
          <div className="ac-content-panel p-6 mb-6">
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
                  className="ac-content-panel p-5"
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
                  className="flex items-center gap-3 ac-content-panel p-4"
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
                  className="flex items-center gap-3 ac-content-panel p-4"
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

        {data && <section className="mt-10 mb-10"><h2 className="text-xl font-semibold mb-4">Activity history</h2><ol className="ac-activity">{data.createdAt > 0 && <li><span>Partner workspace created</span><time dateTime={new Date(data.createdAt).toISOString()}>{new Date(data.createdAt).toLocaleDateString()}</time></li>}{data.updatedAt > 0 && <li><span>Partner workspace updated</span><time dateTime={new Date(data.updatedAt).toISOString()}>{new Date(data.updatedAt).toLocaleDateString()}</time></li>}{data.requests?.map((request,i)=><li key={`${request.createdAt}-${i}`}><span>{request.subject}<span className="block text-sm text-foreground-muted mt-1">{request.message}</span><StatusBadge>{request.status}</StatusBadge></span><time>{new Date(request.createdAt).toLocaleDateString()}</time></li>)}</ol></section>}

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

function PortalMetric({ icon: Icon, label, value, href }: { icon: typeof Package; label: string; value: number; href: string }) {
  return <Link href={href} className="group ac-content-panel p-5 transition hover:-translate-y-0.5 hover:shadow-premium"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-foreground-muted transition group-hover:translate-x-0.5" /></div><div className="mt-5 text-2xl font-semibold"><AnimatedNumber value={value}/></div><div className="mt-1 text-sm text-foreground-muted">{label}</div></Link>;
}

function PortalAction({ icon: Icon, title, description, href }: { icon: typeof Package; title: string; description: string; href: string }) {
  return <Link href={href} className="group ac-content-panel p-5 transition hover:border-accent/30 hover:bg-secondary/30"><Icon className="h-5 w-5 text-accent" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-foreground-muted">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></Link>;
}
