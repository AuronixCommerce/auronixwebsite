'use client';

import { useEffect, useState } from 'react';
import { onAuthChange } from '@/lib/auth';
import { sellerWorkspaceRequest } from '@/lib/seller-workspace-client';
import { SellerLayout } from '@/components/seller/seller-layout';
import { confirmAction } from '@/components/ui/confirm-action';
import { Loader2, Plus, Trash2, Package, X } from 'lucide-react';

interface Product {
  id?: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: string;
  status: string;
  createdAt?: number;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    price: '',
  });

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try { const data = await sellerWorkspaceRequest(); setProducts(data.products); }
      catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load products.'); }
      finally { setLoading(false); }
    });
  }, []);

  const createProduct = async () => {
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    setSaving(true); setError('');
    try { const data = await sellerWorkspaceRequest('', { method: 'POST', body: JSON.stringify({ resource: 'product', ...form }) }); setProducts((current) => [data.item, ...current]); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to create product.'); setSaving(false); return; }

    setForm({
      name: '',
      sku: '',
      category: '',
      description: '',
      price: '',
    });

    setShowForm(false);
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!await confirmAction({ title: 'Delete this product?', description: 'This product will be permanently removed from your seller workspace.', confirmLabel: 'Delete product', destructive: true })) return;
    try { await sellerWorkspaceRequest(`?resource=product&id=${encodeURIComponent(id)}`, { method: 'DELETE' }); setProducts((current) => current.filter((item) => item.id !== id)); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete product.'); }
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Manage the products associated with your seller account.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Package className="w-8 h-8 mx-auto text-foreground-muted mb-3" />
            <h2 className="font-semibold">No products yet</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Add your first product to your seller workspace.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">
                      {product.name}
                    </h2>

                    <p className="text-xs text-foreground-muted mt-1">
                      SKU: {product.sku || '—'}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteProduct(product.id!)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-500/10"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 text-sm text-foreground-muted">
                  {product.description || 'No description provided.'}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    {product.category || 'Uncategorized'}
                  </span>

                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    {product.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">Add Product</h2>

                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <InputField
                  label="Product Name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                />

                <InputField
                  label="SKU"
                  value={form.sku}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      sku: value,
                    }))
                  }
                />

                <InputField
                  label="Category"
                  value={form.category}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      category: value,
                    }))
                  }
                />

                <InputField
                  label="Price"
                  value={form.price}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      price: value,
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
                  onClick={createProduct}
                  disabled={saving}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
                >
                  {saving ? 'Creating…' : 'Create Product'}
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
