import Link from 'next/link';
import { AdminLayout } from '@/components/admin/admin-layout';
import { ArrowRight, Building2, Bot } from 'lucide-react';

export default function SettingsAdminPage() {
  const cards = [
    {
      title: 'Business Information',
      description:
        'Change your public email, phone, WhatsApp, address, social links, company name, and footer information.',
      href: '/admin/settings/business',
      icon: Building2,
    },
    {
      title: 'AI Settings',
      description:
        'Configure the Auronix Assistant, ticket AI, model settings, and approved support context.',
      href: '/admin/ai',
      icon: Bot,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX ADMIN
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Configure the administration and public-facing website.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-border-strong hover:shadow-premium-lg transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>

                <h2 className="mt-5 font-semibold">{card.title}</h2>

                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  {card.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                  Open settings
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
