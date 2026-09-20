'use client';
import { NotificationCount } from './notification-count';
import { WorkspaceFrame } from '@/components/design/workspace-frame';
import { Spinner } from '@/components/design/primitives';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getData } from '@/lib/firebase-db';
import { onAuthChange, signOut } from '@/lib/auth';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AuronixMark } from '@/components/site/auronix-mark';
import { LayoutDashboard, User, Package, FileText, LifeBuoy, Settings, Bell, BriefcaseBusiness } from 'lucide-react';

const NAV = [
  { label: 'Overview', href: '/seller/dashboard', icon: LayoutDashboard },
  { label: 'Deal Room', href: '/seller/deal-room', icon: BriefcaseBusiness },
  { label: 'Profile', href: '/seller/profile', icon: User },
  { label: 'Products', href: '/seller/dashboard/products', icon: Package },
  { label: 'Catalogs', href: '/seller/dashboard/catalogs', icon: FileText },
  { label: 'Support chat', href: '/seller/support/chat', icon: LifeBuoy },
  { label: 'Support', href: '/seller/support', icon: LifeBuoy },
  { label: 'Notifications', href: '/seller/notifications', icon: Bell },
  { label: 'Settings', href: '/seller/settings', icon: Settings },
];

export function SellerLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/seller/login');
        return;
      }
      try {
        const profile = await getData<UserProfile>(`users/${firebaseUser.uid}`);
        if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
          router.push('/seller/login');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/seller/login');
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/seller');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-foreground-muted" />
      </div>
    );
  }

  return <WorkspaceFrame title="Seller" email={user?.email} items={NAV.map(item => ({ ...item, badge: item.href === '/seller/notifications' ? <NotificationCount/> : undefined }))} onSignOut={handleSignOut}>{children}</WorkspaceFrame>;
}
