'use client';
import { NotificationCount } from './notification-count';
import { WorkspaceNav } from '@/components/design/workspace-nav';
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
import { LayoutDashboard, User, Package, FileText, LifeBuoy, Settings, LogOut, Loader2, Bell } from 'lucide-react';

const NAV = [
  { label: 'Overview', href: '/seller/dashboard', icon: LayoutDashboard },
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

  return (
    <div className="ac-admin-shell ac-seller-shell min-h-screen bg-background-subtle flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-40">
        <div className="px-6 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <AuronixMark className="h-7 w-7 shadow-none" />
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight">AURONIX</span>
              <span className="text-[9px] font-medium tracking-[0.15em] text-foreground-muted uppercase">Seller Portal</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}{item.href==='/seller/notifications'&&<NotificationCount/>}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-secondary transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-border px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <AuronixMark className="h-7 w-7 shadow-none" />
          <span className="text-[13px] font-semibold tracking-tight">AURONIX</span>
        </Link>
        <button aria-label="Logout" onClick={handleSignOut} className="text-foreground-muted hover:text-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

<div className="ac-workspace-mobile lg:hidden"><WorkspaceNav items={NAV} title="Seller"/></div>
      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
