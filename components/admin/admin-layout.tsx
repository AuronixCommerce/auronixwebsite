"use client";
import { AdminEmailAlert } from "./email-alert";
import { WorkspaceFrame } from "@/components/design/workspace-frame";
import { Spinner } from "@/components/design/primitives";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getData } from "@/lib/firebase-db";
import { onAuthChange, signOut } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/lib/constants";
import { AuronixMark } from "@/components/site/auronix-mark";
import {
  LayoutDashboard,
  UserCheck,
  Package,
  Mail,
  Ticket,
  FileText,
  HelpCircle,
  Briefcase,
  Users,
  Scale,
  Sparkles,
  Building2,
  UsersRound,
  Settings,
  LogOut,
  Loader2,
  Search,
  Bell,
  ScrollText,
  ShieldCheck,
  BriefcaseBusiness,
  FileSpreadsheet,
  Send,
  Globe,
  Megaphone,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  UserCheck,
  Package,
  Mail,
  Ticket,
  FileText,
  HelpCircle,
  Briefcase,
  Users,
  Scale,
  Sparkles,
  Building2,
  UsersRound,
  Settings,
  ScrollText,
  ShieldCheck,
  BriefcaseBusiness,
  FileSpreadsheet,
  Send,
  Globe,
  Megaphone,
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/admin/login");
        return;
      }
      try {
        const profile = await getData<UserProfile>(`users/${firebaseUser.uid}`);
        if (!profile || profile.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        const token = await firebaseUser.getIdToken();
        const sessionResponse = await fetch("/api/admin/session/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok || !session.valid) {
          router.push("/admin/login");
          return;
        }
        setUser(profile);
      } catch {
        router.push("/admin/login");
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token)
          await fetch("/api/admin/availability", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ heartbeat: true }),
          });
      } catch {}
    }, 60000);
    return () => clearInterval(timer);
  }, [user]);

  const handleSignOut = async () => {
    const token = await auth.currentUser?.getIdToken();
    await fetch("/api/admin/session/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => undefined);
    await signOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-background-subtle"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-background/90 px-8 py-7 shadow-premium">
          <Spinner className="h-7 w-7 text-accent" />
          <p className="text-sm font-medium text-foreground-muted">
            Opening Auronix Admin…
          </p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceFrame
      title="Admin"
      email={user?.email}
      items={ADMIN_NAV.map((item) => ({
        ...item,
        icon: ICON_MAP[item.icon] || LayoutDashboard,
      }))}
      onSignOut={handleSignOut}
    >
      <AdminEmailAlert />
      {children}
    </WorkspaceFrame>
  );
}
