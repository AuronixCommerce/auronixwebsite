'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface AdminField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'boolean';
  required?: boolean;
}

interface AdminCrudPageProps {
  title: string;
  description: string;
  path: string;
  fields: AdminField[];
  searchKeys?: string[];
}

export function AdminCrudPage({
  title,
  description,
  path,
  fields,
  searchKeys = [],
}: AdminCrudPageProps) {
  const [records, setRecords] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!db) return;

    const databaseRef = ref(db, path);

    const unsubscribe = onValue(
      databaseRef,
      (snapshot) => {
        setRecords(snapshot.val() || {});
        setLoading(false);
      },
      (error) => {
        console.error(`Failed to load ${path}:`, error);
        setRecords({});
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path]);

  const filteredRecords = useMemo(() => {
    const entries = Object.entries(records);

    if (!search.trim()) return entries;

    const query = search.toLowerCase();

    return entries.filter(([id, record]) => {
      if (searchKeys.length === 0) {
        return JSON.stringify(record).toLowerCase().includes(query);
      }

      return searchKeys.some((key) =>
        String(record[key] ?? '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [records, search, searchKeys]);

  const openCreate = () => {
    const next: Record<string, any> = {};

    for (const field of fields) {
      next[field.key] =
        field.type === 'boolean'
          ? false
          : field.type === 'number'
            ? 0
            : '';
    }

    setForm(next);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    setForm({ ...records[id] });
    setEditingId(id);
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!db || saving) return;

    for (const field of fields) {
      if (field.required && !String(form[field.key] ?? '').trim()) {
        alert(`${field.label} is required.`);
        return;
      }
    }

    setSaving(true);

    try {
      const now = Date.now();

      if (editingId) {
        await update(ref(db, `${path}/${editingId}`), {
          ...form,
          updatedAt: now,
        });
      } else {
        const newRef = push(ref(db, path));

        await set(newRef, {
          ...form,
          createdAt: now,
          updatedAt: now,
        });
      }

      setShowForm(false);
      setEditingId(null);
      setForm({});
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('Unable to save this record.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!db) return;

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this record?'
    );

    if (!confirmed) return;

    try {
      await remove(ref(db, `${path}/${id}`));
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Unable to delete this record.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
              AURONIX ADMIN
            </div>

            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              {title}
            </h1>

            <p className="mt-2 text-sm text-foreground-muted">
              {description}
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-foreground-muted" />
              </div>
              <h2 className="font-semibold">Nothing here yet</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                No records match your search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRecords.map(([id, record]) => (
                <div
                  key={id}
                  className="p-5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {String(
                            record.title ||
                              record.name ||
                              record.companyName ||
                              record.businessName ||
                              record.question ||
                              record.subject ||
                              id
                          )}
                        </h3>

                        {record.status && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-foreground-muted">
                            {String(record.status)}
                          </span>
                        )}

                        {record.active !== undefined && (
                          <span
                            className={`text-[11px] px-2.5 py-1 rounded-full ${
                              record.active
                                ? 'bg-green-500/10 text-green-700'
                                : 'bg-secondary text-foreground-muted'
                            }`}
                          >
                            {record.active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {fields.slice(0, 3).map((field) => (
                          <div key={field.key} className="text-xs text-foreground-muted truncate">
                            <span className="font-medium text-foreground/70">
                              {field.label}:
                            </span>{' '}
                            {typeof record[field.key] === 'boolean'
                              ? record[field.key]
                                ? 'Yes'
                                : 'No'
                              : String(record[field.key] ?? '—')}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => deleteRecord(id)}
                        className="inline-flex items-center justify-center rounded-xl border border-red-500/20 text-red-600 px-3 py-2 hover:bg-red-500/10 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div>
                <h2 className="font-semibold">
                  {editingId ? 'Edit Record' : 'Create Record'}
                </h2>
                <p className="text-xs text-foreground-muted mt-1">
                  Changes are saved directly to Firebase.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={form[field.key] ?? ''}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: e.target.value,
                        }))
                      }
                      rows={5}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  ) : field.type === 'boolean' ? (
                    <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(form[field.key])}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {form[field.key] ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={form[field.key] ?? ''}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]:
                            field.type === 'number'
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={saveRecord}
                  disabled={saving}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
