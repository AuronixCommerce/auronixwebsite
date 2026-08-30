'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { notifyAction } from '@/components/ui/confirm-action';

import {
  Activity,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Globe,
  Loader2,
  Mail,
  Newspaper,
  ShoppingBag,
  Ticket,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

import {
  onValue,
  ref,
} from 'firebase/database';

import {
  auth,
  db,
} from '@/lib/firebase';

import {
  AdminLayout,
} from '@/components/admin/admin-layout';

interface Counts {
  suppliers: number;
  contacts: number;
  tickets: number;
  sellers: number;
  blog: number;
  careers: number;
  partners: number;
  newsletterSubscribers: number;
}

const INITIAL_COUNTS: Counts = {
  suppliers: 0,
  contacts: 0,
  tickets: 0,
  sellers: 0,
  blog: 0,
  careers: 0,
  partners: 0,
  newsletterSubscribers: 0,
};

export default function AdminDashboardPage() {
  const [
    counts,
    setCounts,
  ] = useState<Counts>(
    INITIAL_COUNTS
  );

  const [
    availability,
    setAvailability,
  ] = useState(true);

  const [
    updatingAvailability,
    setUpdatingAvailability,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribers: Array<
      () => void
    > = [];

    const subscribeToCount = (
      path: string,
      update: (
        current: Counts,
        value: unknown
      ) => Counts
    ) => {
      const unsubscribe =
        onValue(
          ref(db, path),
          (snapshot) => {
            const value =
              snapshot.exists()
                ? snapshot.val()
                : null;

            setCounts(
              (current) =>
                update(
                  current,
                  value
                )
            );

            setLoading(false);
          },
          (error) => {
            console.error(
              `Failed to read ${path}:`,
              error
            );

            setLoading(false);
          }
        );

      unsubscribers.push(
        unsubscribe
      );
    };

    subscribeToCount(
      'suppliers',
      (
        current,
        value
      ) => ({
        ...current,
        suppliers:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'contact',
      (
        current,
        value
      ) => ({
        ...current,
        contacts:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'tickets',
      (
        current,
        value
      ) => ({
        ...current,
        tickets:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'sellerApplications',
      (
        current,
        value
      ) => ({
        ...current,
        sellers:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'blogPosts',
      (
        current,
        value
      ) => {
        let publishedCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          publishedCount =
            Object.values(
              value as Record<
                string,
                {
                  published?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.published ===
                true
            ).length;
        }

        return {
          ...current,
          blog:
            publishedCount,
        };
      }
    );

    subscribeToCount(
      'careers',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  status?: string;
                }
              >
            ).filter(
              (item) =>
                item?.status ===
                'active'
            ).length;
        }

        return {
          ...current,
          careers:
            activeCount,
        };
      }
    );

    subscribeToCount(
      'partners',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  active?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.active ===
                true
            ).length;
        }

        return {
          ...current,
          partners:
            activeCount,
        };
      }
    );

    subscribeToCount(
      'newsletterSubscribers',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  active?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.active ===
                true
            ).length;
        }

        return {
          ...current,
          newsletterSubscribers:
            activeCount,
        };
      }
    );

    return () => {
      unsubscribers.forEach(
        (
          unsubscribe
        ) =>
          unsubscribe()
      );
    };
  }, []);

  useEffect(() => {
    let active =
      true;

    async function loadAvailability() {
      try {
        if (
          !auth.currentUser
        ) {
          return;
        }

        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/availability',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                'no-store',
            }
          );

        if (
          !response.ok
        ) {
          return;
        }

        const data =
          await response.json();

        if (
          active &&
          typeof data.online ===
            'boolean'
        ) {
          setAvailability(
            data.online
          );
        }
      } catch (
        error
      ) {
        console.error(
          'Unable to load admin availability:',
          error
        );
      }
    }

    loadAvailability();

    return () => {
      active =
        false;
    };
  }, []);

  const toggleAvailability =
    async () => {
      if (
        !auth.currentUser ||
        updatingAvailability
      ) {
        return;
      }

      setUpdatingAvailability(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/availability',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  online:
                    !availability,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to update admin availability.'
          );
        }

        setAvailability(
          Boolean(
            data.online
          )
        );
      } catch (
        error
      ) {
        notifyAction(
          error instanceof Error
            ? error.message
            : 'Unable to update admin availability.'
        );
      } finally {
        setUpdatingAvailability(
          false
        );
      }
    };

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
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
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ADMIN AVAILABILITY */}
        <div
          className={`rounded-2xl border p-5 ${
            availability
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-yellow-500/20 bg-yellow-500/5'
          }`}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-4">

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  availability
                    ? 'bg-green-500/10'
                    : 'bg-yellow-500/10'
                }`}
              >
                {availability ? (
                  <Wifi className="h-5 w-5 text-green-700" />
                ) : (
                  <WifiOff className="h-5 w-5 text-yellow-700" />
                )}
              </div>

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="font-semibold">
                    Admin is{' '}
                    {availability
                      ? 'Online'
                      : 'Offline'}
                  </h2>

                  <span
                    className={`h-2 w-2 rounded-full ${
                      availability
                        ? 'animate-pulse bg-green-500'
                        : 'bg-yellow-500'
                    }`}
                  />

                </div>

                <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
                  {availability
                    ? 'Manual support is active. AI will assist when requested.'
                    : 'AI support automation is active for tickets. Seller and partner applications remain manual.'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                toggleAvailability
              }
              disabled={
                updatingAvailability
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                availability
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {updatingAvailability ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : availability ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}

              {availability
                ? 'Go Offline'
                : 'Go Online'}
            </button>

          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Stat
            href="/admin/suppliers"
            label="Supplier Submissions"
            value={
              counts.suppliers
            }
            icon={
              <Building2 className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/contact"
            label="Contact Messages"
            value={
              counts.contacts
            }
            icon={
              <Mail className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/tickets"
            label="Support Tickets"
            value={
              counts.tickets
            }
            icon={
              <Ticket className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/sellers"
            label="Seller Applications"
            value={
              counts.sellers
            }
            icon={
              <Users className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/blog"
            label="Published Articles"
            value={
              counts.blog
            }
            icon={
              <FileText className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/careers"
            label="Active Jobs"
            value={
              counts.careers
            }
            icon={
              <Briefcase className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/partners"
            label="Active Partners"
            value={
              counts.partners
            }
            icon={
              <ShoppingBag className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/newsletter"
            label="Newsletter Subscribers"
            value={
              counts.newsletterSubscribers
            }
            icon={
              <Newspaper className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/pagesmanager"
            label="Pages Manager"
            value="Manage"
            icon={
              <Globe className="h-5 w-5" />
            }
          />

          <Stat
            href="/admin/ai"
            label="AI Workspace"
            value="AI"
            icon={
              <Bot className="h-5 w-5" />
            }
          />

        </div>

        {/* QUICK ACTIONS */}
        <div>

          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />

            <h2 className="text-lg font-semibold">
              Quick actions
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            <QuickAction
              href="/admin/pagesmanager"
              title="Pages Manager"
              description="Test public pages, activate maintenance, and manage dedicated page popups."
            />

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

            <QuickAction
              href="/admin/newsletter"
              title="Newsletter Manager"
              description="Generate, review, and send newsletters to subscribers."
            />

            <QuickAction
              href="/admin/ai"
              title="AI Workspace"
              description="Manage AI-assisted administrative workflows."
            />

          </div>
        </div>

        {/* PAGE CONTROL STATUS */}
        <div className="rounded-2xl border border-border bg-card p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-accent" />

                <h2 className="font-semibold">
                  Website Operations
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
                Pages Manager lets you test public routes,
                temporarily disable individual pages, create
                page-specific announcements, or place the
                entire public website into maintenance mode.
              </p>
            </div>

            <Link
              href="/admin/pagesmanager"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Open Pages Manager
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>
        </div>

        {/* NEWSLETTER */}
        <div className="rounded-2xl border border-border bg-card p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-accent" />

                <h2 className="font-semibold">
                  Newsletter
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
                You currently have{' '}
                <strong className="text-foreground">
                  {
                    counts.newsletterSubscribers
                  }
                </strong>{' '}
                active newsletter subscriber
                {counts.newsletterSubscribers ===
                1
                  ? ''
                  : 's'}
                . Generate, review, and send campaigns from
                Newsletter Manager.
              </p>

            </div>

            <Link
              href="/admin/newsletter"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Open Newsletter Manager
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

        </div>

        {/* SYSTEM */}
        <div className="rounded-2xl border border-border bg-card p-6">

          <h2 className="font-semibold">
            System overview
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Your administration workspace is connected to
            Firebase Realtime Database. Admin availability controls
            support automation, while Pages Manager provides
            independent public-site maintenance and announcement
            controls. Seller, supplier, partner, support, blog,
            newsletter, and other workflows continue to use their
            dedicated administration areas.
          </p>

        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-foreground-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing dashboard data...
          </div>
        )}

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
  value:
    | number
    | string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground-muted">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-foreground-muted" />

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
      className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between gap-4">

        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          <p className="mt-1 text-sm text-foreground-muted">
            {description}
          </p>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted" />

      </div>
    </Link>
  );
}
