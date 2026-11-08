'use client';
import { userFacingError } from '@/lib/user-facing-error';

import { AnimatedNumber, Spinner } from '@/components/design/primitives';
import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, SellerApplication } from '@/lib/types';
import { LoadingState } from '@/components/site/states';
import { Package, FileText, LifeBuoy, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, BriefcaseBusiness, ArrowRight } from 'lucide-react';
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
      } catch (loadError) { if (!quiet) setError(loadError instanceof Error ? userFacingError(loadError) : 'Unable to load the dashboard.'); }
      finally { setLoading(false); setSyncing(false); } };
      await load();
      timer = setInterval(() => load(true), 15000);
      refreshVisible = () => { if (document.visibilityState === 'visible') void load(true); };
      document.addEventListener('visibilitychange', refreshVisible);
    });
    return () => { unsub(); if (timer) clearInterval(timer); if (refreshVisible) document.removeEventListener('visibilitychange', refreshVisible); };
  }, []);

  const accountActive = profile?.status === 'active' && application?.status === 'active';
  const profileComplete = Boolean(profile?.name && profile?.businessName && profile?.phone && profile?.website);
  const manualRefresh = async () => { setSyncing(true); try { await auth.currentUser?.reload(); setEmailVerified(Boolean(auth.currentUser?.emailVerified)); const { sellerWorkspaceRequest } = await import('@/lib/seller-workspace-client'); const data = await sellerWorkspaceRequest(); setProfile(data.profile); setApplication(data.application); setCounts({ products: data.products.length, catalogs: data.catalogs.length, tickets: data.tickets.length }); setLastSynced(data.serverTime || Date.now()); setError(''); } catch (refreshError) { setError(refreshError instanceof Error ? userFacingError(refreshError) : 'Unable to refresh verification status.'); } finally { setSyncing(false); } };

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;
  if (error) return <SellerLayout><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-300">{error}</div></SellerLayout>;

  return <SellerLayout><div className="ax-partner-overview">
    <div className="ax-page-heading"><div><span className="ax-kicker">YOUR PARTNER WORKSPACE</span><h1>Welcome back{profile?.name ? `, ${profile.name}` : ''}.</h1><p>Your products, relationships, and next steps. All in one place.</p></div><button type="button" onClick={manualRefresh} disabled={syncing} className="ax-btn ax-btn-outline">{syncing?<Spinner className="h-4 w-4"/>:<RefreshCw size={15}/>}Refresh status</button></div>
    <div className="ax-stat-grid ax-partner-stats">{[{icon:Package,label:'Products',value:counts.products,href:'/seller/dashboard/products',note:'Your product submissions'},{icon:FileText,label:'Catalogs',value:counts.catalogs,href:'/seller/dashboard/catalogs',note:'Shared product catalogs'},{icon:LifeBuoy,label:'Support tickets',value:counts.tickets,href:'/seller/support',note:'Your conversations'}].map(({icon:Icon,label,value,href,note})=><Link href={href} className="ax-stat-card" key={label}><div><span className="ax-stat-icon"><Icon size={19}/></span><ArrowRight size={17}/></div><span>{label}</span><strong><AnimatedNumber value={value}/></strong><small><span className="ax-stat-dot"/>{note}</small></Link>)}</div>
    <div className="ax-partner-room"><span className="ax-room-icon"><BriefcaseBusiness size={26}/></span><div><span className="ax-kicker">PARTNER DEAL ROOM</span><h2>{accountActive?'Your next conversation starts here.':'Your partnership, taking shape.'}</h2><p>Private terms, shared documents, and partner conversations in one dedicated space.</p></div><Link href={accountActive?'/seller/deal-room':'/seller/support'} className="ax-btn ax-btn-mint">{accountActive?'Open deal room':'Get help'}<ArrowRight size={16}/></Link></div>
    <div className="ax-partner-grid"><section className="ax-panel"><div className="ax-panel-heading"><div><h2>Account readiness</h2><p>Your verification and profile at a glance.</p></div><ShieldCheck size={20}/></div><div className="ax-verifications"><VerificationItem label="Seller account" complete={accountActive} detail={accountActive?'Active and connected':`Application: ${application?.status||'unavailable'}`} href="/seller/support"/><VerificationItem label="Email address" complete={emailVerified} detail={emailVerified?'Email verified with Auronix Auth':'Email verification pending'} href="/seller/settings"/><VerificationItem label="Business profile" complete={profileComplete} detail={profileComplete?'Required profile fields complete':'Add phone, website, and business details'} href="/seller/settings"/></div><div className="ax-partner-sync">{lastSynced?`Last synced ${new Date(lastSynced).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Awaiting account status'} · Refreshes every 15 seconds</div></section>
    <section className="ax-panel"><div className="ax-panel-heading"><div><h2>Business profile</h2><p>The details behind your partnership.</p></div><Link href="/seller/profile" className="ax-text-link">View <ArrowRight size={14}/></Link></div>{application?<dl className="ax-business-details">{[['Business name',application.businessName],['Business type',application.businessType],['Product categories',application.productCategories],['Country',application.country]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl>:<div className="p-6 text-sm text-foreground-muted">Your business details will appear once your application is connected.</div>}</section></div>
  </div></SellerLayout>;
}
function VerificationItem({label,complete,detail,href}:{label:string;complete:boolean;detail:string;href:string}) {return <Link href={href} className="ax-verification">{complete?<CheckCircle2 size={19} className="text-green-600"/>:<AlertCircle size={19} className="text-amber-600"/>}<div><strong>{label}</strong><span>{detail}</span></div><ArrowRight size={15}/></Link>}
