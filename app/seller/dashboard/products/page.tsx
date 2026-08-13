'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { SellerLayout } from '@/components/seller/seller-layout';
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

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    price: '',
  });

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) {
      setLoading(false);
      return;
    }

    return onValue(
      ref(db, `sellerData/${uid}/products`),
      (snapshot) => {
        const value = snapshot.val() || {};

        setProducts(
          Object.entries(value).map(([id, item]) => ({
            id,
            ...(item as Product),
          }))
        );

        setLoading(false);
      }
    );
  }, []);

  const createProduct = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) return;

    if (!form.name.trim()) {
      alert('Product name is required.');
      return;
    }

    const productRef = push(
      ref(db, `sellerData/${uid}/products`)
    );

    await set(productRef, {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      price: form.price.trim(),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setForm({
      name: '',
      sku: '',
      category: '',
      description: '',
      price: '',
    });

    setShowForm(false);
  };

  const deleteProduct = async (id: string) => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) return;

    if (!window.confirm('Delete this product?')) return;

    await remove(
      ref(db, `sellerData/${uid}/products/${id}`)
    );
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
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
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
                >
                  Create Product
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
