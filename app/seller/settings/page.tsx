'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { SellerLayout } from '@/components/seller/seller-layout';
import { Loader2, Save } from 'lucide-react';

interface Settings {
  displayName: string;
  phone: string;
  businessName: string;
  website: string;
}

export default function SellerSettingsPage() {
  const [form, setForm] = useState<Settings>({
    displayName: '',
    phone: '',
    businessName: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) {
      setLoading(false);
      return;
    }

    return onValue(ref(db, `users/${uid}`), (snapshot) => {
      const data = snapshot.val() || {};

      setForm({
        displayName: data.displayName || data.name || '',
        phone: data.phone || '',
        businessName: data.businessName || '',
        website: data.website || '',
      });

      setLoading(false);
    });
  }, []);

  const save = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) return;

    setSaving(true);

    try {
      await update(ref(db, `users/${uid}`), {
        displayName: form.displayName.trim(),
        name: form.displayName.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
        website: form.website.trim(),
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Manage your seller profile information.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <Field
              label="Display Name"
              value={form.displayName}
              onChange={(value) =>
                setForm({ ...form, displayName: value })
              }
            />

            <Field
              label="Business Name"
              value={form.businessName}
              onChange={(value) =>
                setForm({ ...form, businessName: value })
              }
            />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                setForm({ ...form, phone: value })
              }
            />

            <Field
              label="Website"
              value={form.website}
              onChange={(value) =>
                setForm({ ...form, website: value })
              }
            />

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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </SellerLayout>
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
      <label className="block text-sm font-medium mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
      />
    </div>
  );
}
