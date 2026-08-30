'use client';

import { useEffect, useState } from 'react';
import { onAuthChange } from '@/lib/auth';
import { sellerWorkspaceRequest } from '@/lib/seller-workspace-client';
import { SellerLayout } from '@/components/seller/seller-layout';
import { confirmAction } from '@/components/ui/confirm-action';
import { Loader2, Plus, Trash2, FileText, X } from 'lucide-react';

interface Catalog {
  id?: string;
  name: string;
  url: string;
  description: string;
  createdAt?: number;
}

export default function SellerCatalogsPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
  });

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try { const data = await sellerWorkspaceRequest(); setCatalogs(data.catalogs); }
      catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load catalogs.'); }
      finally { setLoading(false); }
    });
  }, []);

  const createCatalog = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError('Catalog name and URL are required.');
      return;
    }
    setSaving(true); setError('');
    try { const data = await sellerWorkspaceRequest('', { method: 'POST', body: JSON.stringify({ resource: 'catalog', ...form }) }); setCatalogs((current) => [data.item, ...current]); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to create catalog.'); setSaving(false); return; }

    setForm({
      name: '',
      url: '',
      description: '',
    });

    setShowForm(false);
    setSaving(false);
  };

  const deleteCatalog = async (id: string) => {
    if (!await confirmAction({ title: 'Delete this catalog?', description: 'This catalog will be permanently removed from your seller workspace.', confirmLabel: 'Delete catalog', destructive: true })) return;
    try { await sellerWorkspaceRequest(`?resource=catalog&id=${encodeURIComponent(id)}`, { method: 'DELETE' }); setCatalogs((current) => current.filter((item) => item.id !== id)); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete catalog.'); }
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Catalogs
            </h1>

            <p className="mt-2 text-sm text-foreground-muted">
              Manage your product catalogs and marketplace resources.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Catalog
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : catalogs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <FileText className="w-8 h-8 mx-auto text-foreground-muted mb-3" />
            <h2 className="font-semibold">No catalogs yet</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Add a catalog URL to make it available in your workspace.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <FileText className="w-5 h-5 text-foreground-muted shrink-0" />

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold">
                    {catalog.name}
                  </h2>

                  <p className="text-sm text-foreground-muted truncate mt-1">
                    {catalog.description || catalog.url}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={catalog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    Open
                  </a>

                  <button
                    onClick={() => deleteCatalog(catalog.id!)}
                    className="rounded-xl border border-red-500/20 text-red-600 px-3 py-2 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">Add Catalog</h2>

                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <InputField
                  label="Catalog Name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                />

                <InputField
                  label="Catalog URL"
                  value={form.url}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      url: value,
                    }))
                  }
                />

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        description: e.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                  />
                </div>

                <button
                  onClick={createCatalog}
                  disabled={saving}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
                >
                  {saving ? 'Creating…' : 'Create Catalog'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}

function InputField({
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
