'use client';

import { useEffect, useState } from 'react';

import {
  CalendarDays,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { confirmAction, notifyAction } from '@/components/ui/confirm-action';

type Release = {
  id: string;
  version: string;
  title: string;
  summary: string;
  releaseDate: number;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
  published?: boolean;
};

const EMPTY_FORM = {
  version: '',
  title: '',
  summary: '',
  releaseDate: '',
  features: '',
  fixes: '',
  improvements: '',
  published: true,
};

export default function AdminChangelogPage() {
  const [releases, setReleases] =
    useState<Release[]>([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const load = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response =
        await fetch(
          '/api/admin/changelog',
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load releases.'
        );
      }

      setReleases(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        'Changelog load failed:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (
      !auth.currentUser ||
      saving
    ) {
      return;
    }

    setSaving(true);

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response =
        await fetch(
          '/api/admin/changelog',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify({
                version:
                  form.version,
                title:
                  form.title,
                summary:
                  form.summary,
                releaseDate:
                  form.releaseDate
                    ? new Date(
                        form.releaseDate
                      ).getTime()
                    : Date.now(),
                features:
                  splitLines(
                    form.features
                  ),
                fixes:
                  splitLines(
                    form.fixes
                  ),
                improvements:
                  splitLines(
                    form.improvements
                  ),
                published:
                  form.published,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to create release.'
        );
      }

      setForm(
        EMPTY_FORM
      );

      setShowForm(false);

      await load();

      notifyAction(
        'Release published successfully.'
      );
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to create release.'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (
    id: string
  ) => {
    if (
      !auth.currentUser
    ) {
      return;
    }

    if (
      !await confirmAction({
        title: 'Delete this release?',
        description: 'This release will be permanently removed from the public changelog.',
        confirmLabel: 'Delete release',
        destructive: true,
      })
    ) {
      return;
    }

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response =
        await fetch(
          '/api/admin/changelog',
          {
            method: 'DELETE',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify({
                id,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to delete release.'
        );
      }

      await load();
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to delete release.'
      );
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              WEBSITE UPDATES
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              What's New Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
              Publish polished release notes describing what visitors
              will notice across the Auronix experience.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowForm(
                (value) => !value
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            {showForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {showForm
              ? 'Cancel'
              : 'New Release'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Version"
                  placeholder="1.6.0"
                  value={form.version}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      version: value,
                    })
                  }
                />

                <Field
                  label="Release Date"
                  type="date"
                  value={
                    form.releaseDate
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      releaseDate:
                        value,
                    })
                  }
                />
              </div>

              <Field
                label="Release Title"
                placeholder="A more intelligent Auronix experience"
                value={form.title}
                onChange={(value) =>
                  setForm({
                    ...form,
                    title: value,
                  })
                }
              />

              <div>
                <label className="text-sm font-medium">
                  Summary
                </label>

                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      summary:
                        event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Describe this release in a visitor-friendly way."
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <TextListField
                label="New & Improved"
                placeholder={`Seller experience improved\nNew support workflow\nUpdated website experience`}
                value={
                  form.features
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    features:
                      value,
                  })
                }
              />

              <TextListField
                label="Fixes"
                placeholder={`Improved support response handling\nResolved account invitation issues\nImproved mobile behavior`}
                value={
                  form.fixes
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    fixes:
                      value,
                  })
                }
              />

              <TextListField
                label="Refinements"
                placeholder={`Faster navigation\nCleaner layouts\nImproved communication experience`}
                value={
                  form.improvements
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    improvements:
                      value,
                  })
                }
              />

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={
                    form.published
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      published:
                        event.target.checked,
                    })
                  }
                />

                Publish immediately
              </label>

              <div>
                <button
                  type="button"
                  onClick={save}
                  disabled={
                    saving
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Publishing...'
                    : 'Publish Release'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : releases.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <h2 className="font-semibold">
              No releases yet.
            </h2>

            <p className="mt-2 text-sm text-foreground-muted">
              Create your first What's New release.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {releases.map(
              (release) => (
                <div
                  key={release.id}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold">
                          v{release.version}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                          <CalendarDays className="h-3.5 w-3.5" />

                          {release.releaseDate
                            ? new Date(
                                release.releaseDate
                              ).toLocaleDateString()
                            : 'No date'}
                        </span>
                      </div>

                      <h2 className="mt-4 text-xl font-semibold">
                        {release.title}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-foreground-muted">
                        {release.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        remove(
                          release.id
                        )
                      }
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-red-500/20 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function splitLines(
  value: string
): string[] {
  return value
    .split('\n')
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

function TextListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows={5}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-accent/20"
      />

      <p className="mt-1 text-xs text-foreground-muted">
        Put one update per line.
      </p>
    </div>
  );
}
