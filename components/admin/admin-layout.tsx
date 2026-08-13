'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getData } from '@/lib/firebase-db';
import { onAuthChange, signOut } from '@/lib/auth';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ADMIN_NAV } from '@/lib/constants';
import {
  LayoutDashboard, UserCheck, Package, Mail, Ticket, FileText,
  HelpCircle, Briefcase, Users, Scale, Sparkles, Building2,
  UsersRound, Settings, LogOut, Loader2, Search, Bell,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, UserCheck, Package, Mail, Ticket, FileText,
  HelpCircle, Briefcase, Users, Scale, Sparkles, Building2,
  UsersRound, Settings,
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
    await signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-subtle flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-40">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
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
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Admin</span>
        </Link>
        <button onClick={handleSignOut} className="text-foreground-muted hover:text-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile nav */}
      <div className="lg:hidden fixed top-14 inset-x-0 z-30 bg-card border-b border-border overflow-x-auto">
        <div className="flex gap-1 px-3 py-2">
          {ADMIN_NAV.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search…"
              className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border bg-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 w-64"
            />
          </div>
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
