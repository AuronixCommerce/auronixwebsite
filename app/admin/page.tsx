'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Mail,
  Ticket,
  UserCheck,
  Briefcase,
  BookOpen,
  Users,
  Activity,
} from 'lucide-react';

import { AdminLayout } from '@/components/admin/admin-layout';
import { getData } from '@/lib/firebase-db';
import type {
  SupplierSubmission,
  ContactMessage,
  SupportTicket,
  BlogPost,
  SellerApplication,
  JobPosting,
  Partner,
} from '@/lib/types';

interface DashboardCounts {
  suppliers: number;
  contacts: number;
  tickets: number;
  sellers: number;
  blogs: number;
  jobs: number;
  partners: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    suppliers: 0,
    contacts: 0,
    tickets: 0,
    sellers: 0,
    blogs: 0,
    jobs: 0,
    partners: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          suppliers,
          contacts,
          tickets,
          sellers,
          blogs,
          jobs,
          partners,
        ] = await Promise.all([
          getData<Record<string, SupplierSubmission>>('suppliers'),
          getData<Record<string, ContactMessage>>('contactMessages'),
          getData<Record<string, SupportTicket>>('tickets'),
          getData<Record<string, SellerApplication>>('sellerApplications'),
          getData<Record<string, BlogPost>>('blogPosts'),
          getData<Record<string, JobPosting>>('careers'),
          getData<Record<string, Partner>>('partners'),
        ]);

        setCounts({
          suppliers: suppliers ? Object.keys(suppliers).length : 0,
          contacts: contacts ? Object.keys(contacts).length : 0,
          tickets: tickets ? Object.keys(tickets).length : 0,
          sellers: sellers ? Object.keys(sellers).length : 0,
          blogs: blogs ? Object.keys(blogs).length : 0,
          jobs: jobs
            ? Object.values(jobs).filter((job) => job.status === 'active').length
            : 0,
          partners: partners
            ? Object.values(partners).filter((partner) => partner.active).length
            : 0,
        });
      } catch (error) {
        console.error('Failed to load admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const cards = [
    {
      label: 'Supplier Submissions',
      value: counts.suppliers,
      icon: UserCheck,
      href: '/admin/suppliers',
    },
    {
      label: 'Contact Messages',
      value: counts.contacts,
      icon: Mail,
      href: '/admin/contact',
    },
    {
      label: 'Support Tickets',
      value: counts.tickets,
      icon: Ticket,
      href: '/admin/tickets',
    },
    {
      label: 'Seller Applications',
      value: counts.sellers,
      icon: Users,
      href: '/admin/sellers',
    },
    {
      label: 'Published Articles',
      value: counts.blogs,
      icon: BookOpen,
      href: '/admin/blog',
    },
    {
      label: 'Active Jobs',
      value: counts.jobs,
      icon: Briefcase,
      href: '/admin/careers',
    },
    {
      label: 'Active Partners',
      value: counts.partners,
      icon: Activity,
      href: '/admin/partners',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-accent mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Auronix Commerce
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
                Dashboard
              </h1>

              <p className="mt-2 text-sm lg:text-base text-foreground-muted">
                Overview of your Auronix Commerce operations.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              View website
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-2xl border border-border bg-card p-5 hover:border-border-strong hover:shadow-premium-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>

                  <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="mt-6">
                  <div className="text-3xl font-semibold tracking-tight">
                    {loading ? '—' : card.value}
                  </div>

                  <div className="mt-1 text-sm text-foreground-muted">
                    {card.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Quick actions
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                Jump directly into the most-used areas.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              href="/admin/sellers"
              icon={Users}
              title="Review Sellers"
              description="Manage seller applications and approvals."
            />

            <QuickAction
              href="/admin/suppliers"
              icon={UserCheck}
              title="Review Suppliers"
              description="Review incoming supplier submissions."
            />

            <QuickAction
              href="/admin/tickets"
              icon={Ticket}
              title="Support Tickets"
              description="Review and respond to open tickets."
            />

            <QuickAction
              href="/admin/blog"
              icon={FileText}
              title="Manage Blog"
              description="Create, edit, and publish articles."
            />
          </div>
        </section>

        {/* System status */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            </div>

            <div>
              <h2 className="font-semibold">System overview</h2>

              <p className="text-sm text-foreground-muted mt-1">
                Your administration workspace is ready. Live counts above are
                loaded directly from Firebase Realtime Database.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-5 hover:border-border-strong hover:shadow-premium-lg transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
        <Icon className="w-4 h-4 text-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
        {description}
      </p>
    </Link>
  );
}