'use client';
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
import { ADMIN_NAV } from '@/lib/constants';
import { AuronixMark } from '@/components/site/auronix-mark';
import {
  LayoutDashboard, UserCheck, Package, Mail, Ticket, FileText,
  HelpCircle, Briefcase, Users, Scale, Sparkles, Building2,
  UsersRound, Settings, LogOut, Loader2, Search, Bell, ScrollText, ShieldCheck,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, UserCheck, Package, Mail, Ticket, FileText,
  HelpCircle, Briefcase, Users, Scale, Sparkles, Building2,
  UsersRound, Settings, ScrollText, ShieldCheck,
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/admin/login');
        return;
      }
      try {
        const profile = await getData<UserProfile>(`users/${firebaseUser.uid}`);
        if (!profile || profile.role !== 'admin') {
          router.push('/admin/login');
          return;
        }
        const token = await firebaseUser.getIdToken();
        const sessionResponse = await fetch('/api/admin/session/status', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok || !session.valid) { router.push('/admin/login'); return; }
        setUser(profile);
      } catch {
        router.push('/admin/login');
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSignOut = async () => {
    const token = await auth.currentUser?.getIdToken();
    await fetch('/api/admin/session/logout', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => undefined);
    await signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <Spinner className="w-8 h-8 text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="ac-admin-shell min-h-screen bg-background-subtle flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-40">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <AuronixMark className="h-7 w-7 shadow-none" />
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight">AURONIX</span>
              <span className="text-[9px] font-medium tracking-[0.15em] text-foreground-muted uppercase">Admin</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
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
        <Link href="/admin" className="flex items-center gap-2">
          <AuronixMark className="h-7 w-7 shadow-none" />
          <span className="text-[13px] font-semibold tracking-tight">Admin</span>
        </Link>
        <button aria-label="Logout" onClick={handleSignOut} className="text-foreground-muted hover:text-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

<div className="ac-workspace-mobile lg:hidden"><WorkspaceNav items={ADMIN_NAV} title="Admin"/></div>
      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 border-b border-border bg-card">
<div className="w-72"><WorkspaceNav items={ADMIN_NAV} title="Admin"/></div>
          <div className="flex items-center gap-4">
            <button className="text-foreground-muted hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
