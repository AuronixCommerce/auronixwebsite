'use client';

import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { auth } from '@/lib/firebase';
import { getData } from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, SellerApplication } from '@/lib/types';
import { LoadingState, EmptyState } from '@/components/site/states';
import { Package, FileText, MessageSquare, LifeBuoy, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const p = await getData<UserProfile>(`users/${user.uid}`);
        setProfile(p);
        if (p?.sellerApplicationId) {
          const app = await getData<SellerApplication>(`sellerApplications/${p.sellerApplicationId}`);
          setApplication(app);
        }
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;

  return (
    <SellerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Welcome back{profile?.name ? `, ${profile.name}` : ''}.</h1>
        <p className="text-sm text-foreground-muted">Here is an overview of your seller account.</p>
      </div>

      {/* Status card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">Account Status</p>
            <p className="text-lg font-semibold capitalize">{profile?.status || 'Active'}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse-soft" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: 'Products', value: '—', href: '/seller/dashboard/products' },
          { icon: FileText, label: 'Catalogs', value: '—', href: '/seller/dashboard/catalogs' },
          { icon: MessageSquare, label: 'Messages', value: '—', href: '/seller/dashboard/messages' },
          { icon: LifeBuoy, label: 'Support', value: '—', href: '/seller/support' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="group rounded-xl border border-border bg-card p-5 hover:shadow-premium transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/5 border border-border flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <Icon className="w-4 h-4 text-foreground-muted group-hover:text-accent transition-colors" />
                </div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Business info */}
      {application && (
        <div className="rounded-2xl border border-border bg-card p-6">
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
