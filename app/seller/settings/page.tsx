'use client';
import { Spinner } from '@/components/design/primitives';

import { useEffect, useState } from 'react';
import { onAuthChange } from '@/lib/auth';
import { sellerWorkspaceRequest } from '@/lib/seller-workspace-client';
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
      const workspace = await sellerWorkspaceRequest(); const data = workspace.profile || {};

      setForm({
        displayName: data.displayName || data.name || '',
        phone: data.phone || '',
        businessName: data.businessName || '',
        website: data.website || '',
      });

      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.'); }
      finally { setLoading(false); }
    });
  }, []);

  const save = async () => {
    setSaving(true); setError(''); setMessage('');

    try {
      await sellerWorkspaceRequest('', { method: 'PATCH', body: JSON.stringify({
        displayName: form.displayName.trim(),
        name: form.displayName.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
        website: form.website.trim(),
      }) });
      setMessage('Settings saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.');
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
          <div className="ac-content-panel p-12 flex justify-center">
            <Spinner className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="ac-content-panel p-6 space-y-5">
            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {message && <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700 dark:text-green-300">{message}</div>}
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
                <Spinner className="w-4 h-4 animate-spin" />
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
