'use client';

import { AnimatedNumber, Spinner } from '@/components/design/primitives';
import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, SellerApplication } from '@/lib/types';
import { LoadingState } from '@/components/site/states';
import { Package, FileText, LifeBuoy, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

export default function SellerDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ products: 0, catalogs: 0, tickets: 0 });
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let refreshVisible: (() => void) | undefined;
    const unsub = onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      const load = async (quiet = false) => { try {
        if (!quiet) setSyncing(true);
        await user.reload(); setEmailVerified(user.emailVerified);
        const { sellerWorkspaceRequest } = await import('@/lib/seller-workspace-client');
        const data = await sellerWorkspaceRequest();
        setProfile(data.profile); setApplication(data.application);
        setCounts({ products: data.products.length, catalogs: data.catalogs.length, tickets: data.tickets.length });
        setLastSynced(data.serverTime || Date.now()); setError('');
      } catch (loadError) { if (!quiet) setError(loadError instanceof Error ? loadError.message : 'Unable to load the dashboard.'); }
      finally { setLoading(false); setSyncing(false); } };
      await load();
      timer = setInterval(() => load(true), 15000);
      refreshVisible = () => { if (document.visibilityState === 'visible') void load(true); };
      document.addEventListener('visibilitychange', refreshVisible);
    });
    return () => { unsub(); if (timer) clearInterval(timer); if (refreshVisible) document.removeEventListener('visibilitychange', refreshVisible); };
  }, []);

  const applicationData = application as (SellerApplication & { whatsappVerified?: boolean; whatsappVerifiedAt?: number; phoneNormalized?: string }) | null;
  const whatsappVerified = Boolean(applicationData?.whatsappVerified || applicationData?.whatsappVerifiedAt);
  const accountActive = profile?.status === 'active' && application?.status === 'active';
  const profileComplete = Boolean(profile?.name && profile?.businessName && profile?.phone && profile?.website);
  const manualRefresh = async () => { setSyncing(true); try { await auth.currentUser?.reload(); setEmailVerified(Boolean(auth.currentUser?.emailVerified)); const { sellerWorkspaceRequest } = await import('@/lib/seller-workspace-client'); const data = await sellerWorkspaceRequest(); setProfile(data.profile); setApplication(data.application); setCounts({ products: data.products.length, catalogs: data.catalogs.length, tickets: data.tickets.length }); setLastSynced(data.serverTime || Date.now()); setError(''); } catch (refreshError) { setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh verification status.'); } finally { setSyncing(false); } };

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;
  if (error) return <SellerLayout><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-300">{error}</div></SellerLayout>;

  return (
    <SellerLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Welcome back{profile?.name ? `, ${profile.name}` : ''}.</h1>
        <p className="text-sm text-foreground-muted">Live account, verification, and workspace status.</p>
        </div>
        <button type="button" onClick={manualRefresh} disabled={syncing} className="inline-flex items-center justify-center gap-2 ac-content-panel px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50">{syncing ? <Spinner className="h-4 w-4"/> : <RefreshCw className="h-4 w-4"/>}Refresh status</button>
      </div>

      <div className="mb-8 ac-content-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /><h2 className="font-semibold">Verification center</h2></div><p className="mt-1 text-sm text-foreground-muted">Automatically refreshes every 15 seconds while this page is open.</p></div>
          {lastSynced && <span className="text-xs text-foreground-muted">Synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <VerificationItem label="Seller account" complete={accountActive} detail={accountActive ? 'Active and connected' : `Application: ${application?.status || 'unavailable'}`} href="/seller/support" />
          <VerificationItem label="WhatsApp number" complete={whatsappVerified} detail={whatsappVerified ? 'Verified during application' : 'Verification not recorded'} href="/seller/support" />
          <VerificationItem label="Email address" complete={emailVerified} detail={emailVerified ? 'Firebase email verified' : 'Email verification pending'} href="/seller/settings" />
          <VerificationItem label="Business profile" complete={profileComplete} detail={profileComplete ? 'Required profile fields complete' : 'Add phone, website, and business details'} href="/seller/settings" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Package, label: 'Products', value: String(counts.products), href: '/seller/dashboard/products' },
          { icon: FileText, label: 'Catalogs', value: String(counts.catalogs), href: '/seller/dashboard/catalogs' },
          { icon: LifeBuoy, label: 'Support Tickets', value: String(counts.tickets), href: '/seller/support' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="group ac-content-panel p-5 hover:shadow-premium transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/5 border border-border flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <Icon className="w-4 h-4 text-foreground-muted group-hover:text-accent transition-colors" />
                </div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xl font-semibold"><AnimatedNumber value={Number(stat.value)}/></p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Business info */}
      {application && (
        <div className="ac-content-panel p-6">
          <h2 className="text-lg font-semibold tracking-tight mb-4">Business Information</h2>
          <dl className="grid sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Business Name</dt>
              <dd className="text-sm text-foreground mt-1">{application.businessName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Business Type</dt>
              <dd className="text-sm text-foreground mt-1">{application.businessType}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Product Categories</dt>
              <dd className="text-sm text-foreground mt-1">{application.productCategories}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Country</dt>
              <dd className="text-sm text-foreground mt-1">{application.country}</dd>
            </div>
          </dl>
        </div>
      )}
    </SellerLayout>
  );
}

function VerificationItem({ label, complete, detail, href }: { label: string; complete: boolean; detail: string; href: string }) {
  return <Link href={href} className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4 transition hover:bg-secondary/60">{complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}<span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-foreground-muted">{detail}</span></span></Link>;
}
