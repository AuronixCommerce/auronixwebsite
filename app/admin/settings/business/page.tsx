'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Loader2, Save } from 'lucide-react';

const DEFAULTS = {
  companyName: 'Auronix Commerce LLC',
  tagline: 'Powering the next generation of commerce.',
  publicEmail: '',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  businessAddress: '',
  country: '',
  website: '',
  linkedin: '',
  instagram: '',
  facebook: '',
  x: '',
  footerDescription: '',
  legalName: 'Auronix Commerce LLC',
};

export default function BusinessSettingsPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;

    return onValue(ref(db, 'site/settings/company'), (snapshot) => {
      setForm({
        ...DEFAULTS,
        ...(snapshot.val() || {}),
      });
      setLoading(false);
    });
  }, []);

  const updateField = (key: keyof typeof DEFAULTS, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const save = async () => {
    if (!db) return;

    setSaving(true);

    try {
      await set(ref(db, 'site/settings/company'), {
        ...form,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX ADMIN
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Business Information
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Change the public company information used across the website and future emails.
          </p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-8">
            <Group title="Company">
              <Field label="Company Name" value={form.companyName} onChange={(v) => updateField('companyName', v)} />
              <Field label="Legal Name" value={form.legalName} onChange={(v) => updateField('legalName', v)} />
              <Field label="Tagline" value={form.tagline} onChange={(v) => updateField('tagline', v)} />
              <Field label="Website" value={form.website} onChange={(v) => updateField('website', v)} />
            </Group>

            <Group title="Contact">
              <Field label="Public Email" value={form.publicEmail} onChange={(v) => updateField('publicEmail', v)} />
              <Field label="Support Email" value={form.supportEmail} onChange={(v) => updateField('supportEmail', v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => updateField('phone', v)} />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => updateField('whatsapp', v)} />
            </Group>

            <Group title="Location">
              <Field label="Country" value={form.country} onChange={(v) => updateField('country', v)} />
              <Field label="Business Address" value={form.businessAddress} onChange={(v) => updateField('businessAddress', v)} />
            </Group>

            <Group title="Social Links">
              <Field label="LinkedIn" value={form.linkedin} onChange={(v) => updateField('linkedin', v)} />
              <Field label="Instagram" value={form.instagram} onChange={(v) => updateField('instagram', v)} />
              <Field label="Facebook" value={form.facebook} onChange={(v) => updateField('facebook', v)} />
              <Field label="X" value={form.x} onChange={(v) => updateField('x', v)} />
            </Group>

            <Group title="Footer">
              <textarea
                value={form.footerDescription}
                onChange={(e) => updateField('footerDescription', e.target.value)}
                rows={4}
                placeholder="Footer description"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </Group>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : 'Save Business Information'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
      />
    </div>
  );
}
