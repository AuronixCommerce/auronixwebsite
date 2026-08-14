'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';

import { db, auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';

import {
  ArrowRight,
  Activity,
  Building2,
  FileText,
  Briefcase,
  Mail,
  Ticket,
  Users,
  ShoppingBag,
  Bot,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

interface Counts {
  suppliers: number;
  contacts: number;
  tickets: number;
  sellers: number;
  blog: number;
  careers: number;
  partners: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts>({
    suppliers: 0,
    contacts: 0,
    tickets: 0,
    sellers: 0,
    blog: 0,
    careers: 0,
    partners: 0,
  });

  const [availability, setAvailability] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribers: Array<() => void> = [];

    const suppliersUnsub = onValue(
      ref(db, 'suppliers'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        setCounts((current) => ({
          ...current,
          suppliers:
            value && typeof value === 'object'
              ? Object.keys(value).length
              : 0,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(suppliersUnsub);

    const contactUnsub = onValue(
      ref(db, 'contact'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        setCounts((current) => ({
          ...current,
          contacts:
            value && typeof value === 'object'
              ? Object.keys(value).length
              : 0,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(contactUnsub);

    const ticketsUnsub = onValue(
      ref(db, 'tickets'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        setCounts((current) => ({
          ...current,
          tickets:
            value && typeof value === 'object'
              ? Object.keys(value).length
              : 0,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(ticketsUnsub);

    const sellersUnsub = onValue(
      ref(db, 'sellerApplications'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        setCounts((current) => ({
          ...current,
          sellers:
            value && typeof value === 'object'
              ? Object.keys(value).length
              : 0,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(sellersUnsub);

    const blogUnsub = onValue(
      ref(db, 'blogPosts'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        let publishedCount = 0;

        if (value && typeof value === 'object') {
          publishedCount = Object.values(value).filter(
            (item) =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  (item as { published?: boolean }).published === true
              )
          ).length;
        }

        setCounts((current) => ({
          ...current,
          blog: publishedCount,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(blogUnsub);

    const careersUnsub = onValue(
      ref(db, 'careers'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        let activeCount = 0;

        if (value && typeof value === 'object') {
          activeCount = Object.values(value).filter(
            (item) =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  (item as { status?: string }).status === 'active'
              )
          ).length;
        }

        setCounts((current) => ({
          ...current,
          careers: activeCount,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(careersUnsub);

    const partnersUnsub = onValue(
      ref(db, 'partners'),
      (snapshot) => {
        const value = snapshot.exists()
          ? snapshot.val()
          : null;

        let activeCount = 0;

        if (value && typeof value === 'object') {
          activeCount = Object.values(value).filter(
            (item) =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  (item as { active?: boolean }).active === true
              )
          ).length;
        }

        setCounts((current) => ({
          ...current,
          partners: activeCount,
        }));

        setLoading(false);
      }
    );

    unsubscribers.push(partnersUnsub);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadAvailability = async () => {
      if (!auth.currentUser) return;

      try {
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(
          '/api/admin/availability',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (
          active &&
          typeof data.online === 'boolean'
        ) {
          setAvailability(data.online);
        }
      } catch (error) {
        console.error(
          'Unable to load admin availability:',
          error
        );
      }
    };

    loadAvailability();

    return () => {
      active = false;
    };
  }, []);

  const toggleAvailability = async () => {
    if (!auth.currentUser || updatingAvailability) {
      return;
    }

    setUpdatingAvailability(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/availability',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            online: !availability,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to update admin availability.'
        );
      }

      setAvailability(Boolean(data.online));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to update admin availability.'
      );
    } finally {
      setUpdatingAvailability(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
              AURONIX ADMIN
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-foreground-muted">
              Overview of your Auronix Commerce operations.
            </p>
          </div>

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            View Website
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            availability
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-yellow-500/20 bg-yellow-500/5'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  availability
                    ? 'bg-green-500/10'
                    : 'bg-yellow-500/10'
                }`}
              >
                {availability ? (
                  <Wifi className="w-5 h-5 text-green-700" />
                ) : (
                  <WifiOff className="w-5 h-5 text-yellow-700" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">
                    Admin is {availability ? 'Online' : 'Offline'}
                  </h2>

                  <span
                    className={`w-2 h-2 rounded-full ${
                      availability
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-yellow-500'
                    }`}
                  />
                </div>

                <p className="text-sm text-foreground-muted mt-1 max-w-2xl">
                  {availability
                    ? 'Manual support is active. AI will assist when requested.'
                    : 'AI support automation is active for tickets. Seller and partner applications remain manual.'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleAvailability}
              disabled={updatingAvailability}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${
                availability
                  ? 'bg-yellow-600 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              {updatingAvailability ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : availability ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}

              {availability
                ? 'Go Offline'
                : 'Go Online'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            href="/admin/suppliers"
            label="Supplier Submissions"
            value={counts.suppliers}
            icon={<Building2 className="w-5 h-5" />}
          />

          <Stat
            href="/admin/contact"
            label="Contact Messages"
            value={counts.contacts}
            icon={<Mail className="w-5 h-5" />}
          />

          <Stat
            href="/admin/tickets"
            label="Support Tickets"
            value={counts.tickets}
            icon={<Ticket className="w-5 h-5" />}
          />

          <Stat
            href="/admin/sellers"
            label="Seller Applications"
            value={counts.sellers}
            icon={<Users className="w-5 h-5" />}
          />

          <Stat
            href="/admin/blog"
            label="Published Articles"
            value={counts.blog}
            icon={<FileText className="w-5 h-5" />}
          />

          <Stat
            href="/admin/careers"
            label="Active Jobs"
            value={counts.careers}
            icon={<Briefcase className="w-5 h-5" />}
          />

          <Stat
            href="/admin/partners"
            label="Active Partners"
            value={counts.partners}
            icon={<ShoppingBag className="w-5 h-5" />}
          />

          <Stat
            href="/admin/ai"
            label="AI Workspace"
            value="AI"
            icon={<Bot className="w-5 h-5" />}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" />

            <h2 className="text-lg font-semibold">
              Quick actions
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <QuickAction
              href="/admin/sellers"
              title="Review Sellers"
              description="Manage seller applications and approvals."
            />

            <QuickAction
              href="/admin/suppliers"
              title="Review Suppliers"
              description="Review incoming supplier submissions."
            />

            <QuickAction
              href="/admin/tickets"
              title="Support Tickets"
              description="Review tickets and use AI-assisted support."
            />

            <QuickAction
              href="/admin/blog"
              title="Manage Blog"
              description="Create, edit, publish, and delete articles."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">
            System overview
          </h2>

          <p className="text-sm text-foreground-muted mt-2 leading-relaxed">
            Your administration workspace is connected to
            Firebase Realtime Database. Admin availability controls
            whether automated support handling is active.
            Seller and partner applications always require human review.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 hover:bg-secondary/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground-muted">
          {icon}
        </div>

        <ArrowRight className="w-4 h-4 text-foreground-muted" />
      </div>

      <div className="mt-5 text-3xl font-semibold">
        {value}
      </div>

      <div className="mt-1 text-sm text-foreground-muted">
        {label}
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 hover:bg-secondary/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          <p className="text-sm text-foreground-muted mt-1">
            {description}
          </p>
        </div>

        <ArrowRight className="w-4 h-4 shrink-0 text-foreground-muted" />
      </div>
    </Link>
  );
}
