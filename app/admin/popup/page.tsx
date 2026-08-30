'use client';

import { useEffect, useState } from 'react';

import {
  BellRing,
  Eye,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { notifyAction } from '@/components/ui/confirm-action';

type PopupData = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  message: string;
  buttonText: string;
  buttonHref: string;
  secondaryText: string;
  secondaryHref: string;
  showOncePerSession: boolean;
  delay: number;
};

const DEFAULTS: PopupData = {
  enabled: true,
  eyebrow: 'AURONIX',
  title: 'What’s new at Auronix',
  message:
    'Discover the latest improvements, features, and updates across Auronix Commerce.',
  buttonText: 'See What’s New',
  buttonHref: '/whats-new',
  secondaryText: 'Close',
  secondaryHref: '',
  showOncePerSession: false,
  delay: 700,
};

export default function AdminPopupPage() {
  const [data, setData] =
    useState<PopupData>(DEFAULTS);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const update = <
    K extends keyof PopupData
  >(
    key: K,
    value: PopupData[K]
  ) => {
    setData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    let active = true;

    async function loadPopup() {
      try {
        if (!auth.currentUser) {
          if (active) {
            setLoading(false);
          }
          return;
        }

        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/popup',
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: 'no-store',
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Unable to load popup settings.'
          );
        }

        if (!active) {
          return;
        }

        setData({
          ...DEFAULTS,
          ...result,
          enabled:
            result.enabled === true,
          showOncePerSession:
            result.showOncePerSession === true,
        });
      } catch (error) {
        console.error(
          'Popup manager load failed:',
          error
        );

        if (active) {
          setData(DEFAULTS);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPopup();

    return () => {
      active = false;
    };
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
          '/api/admin/popup',
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
                ...data,
                delay: Math.max(
                  0,
                  Math.min(
                    10000,
                    Number(
                      data.delay || 0
                    )
                  )
                ),
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to save popup.'
        );
      }

      setData({
        ...DEFAULTS,
        ...result,
      });

      notifyAction(
        'Website popup updated successfully.'
      );
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to save popup.'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setData(DEFAULTS);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-8">
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            WEBSITE EXPERIENCE
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Popup Manager
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
            Control the announcement visitors see when they enter
            the public Auronix website.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Editor */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <BellRing className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Popup Content
                  </h2>

                  <p className="mt-1 text-xs text-foreground-muted">
                    Save changes to update the public website.
                  </p>
                </div>
              </div>

              {/* GREEN ON / WHITE OFF TOGGLE */}
              <button
                type="button"
                onClick={() =>
                  update(
                    'enabled',
                    !data.enabled
                  )
                }
                aria-label={
                  data.enabled
                    ? 'Turn popup off'
                    : 'Turn popup on'
                }
                aria-pressed={
                  data.enabled
                }
                className={`relative h-8 w-14 rounded-full border transition-all duration-200 ${
                  data.enabled
                    ? 'border-green-600 bg-green-500'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                    data.enabled
                      ? 'translate-x-7 bg-white'
                      : 'translate-x-1 bg-gray-300'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">
                    Popup status
                  </div>

                  <div className="mt-1 text-xs text-foreground-muted">
                    {data.enabled
                      ? 'The popup is enabled on the public website.'
                      : 'The popup is disabled on the public website.'}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    data.enabled
                      ? 'bg-green-500/10 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {data.enabled
                    ? 'ON'
                    : 'OFF'}
                </span>
              </div>

              <Field
                label="Eyebrow"
                value={data.eyebrow}
                placeholder="AURONIX"
                onChange={(value) =>
                  update(
                    'eyebrow',
                    value
                  )
                }
              />

              <Field
                label="Title"
                value={data.title}
                placeholder="What’s new at Auronix"
                onChange={(value) =>
                  update(
                    'title',
                    value
                  )
                }
              />

              <div>
                <label className="text-sm font-medium">
                  Message
                </label>

                <textarea
                  value={data.message}
                  onChange={(event) =>
                    update(
                      'message',
                      event.target.value
                    )
                  }
                  rows={7}
                  placeholder="Write your announcement..."
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-accent/20"
                />

                <p className="mt-1 text-xs text-foreground-muted">
                  You can use multiple paragraphs.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Primary Button"
                  value={
                    data.buttonText
                  }
                  placeholder="See What’s New"
                  onChange={(value) =>
                    update(
                      'buttonText',
                      value
                    )
                  }
                />

                <Field
                  label="Primary Link"
                  value={
                    data.buttonHref
                  }
                  placeholder="/whats-new"
                  onChange={(value) =>
                    update(
                      'buttonHref',
                      value
                    )
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Secondary Button"
                  value={
                    data.secondaryText
                  }
                  placeholder="Close"
                  onChange={(value) =>
                    update(
                      'secondaryText',
                      value
                    )
                  }
                />

                <Field
                  label="Secondary Link"
                  value={
                    data.secondaryHref
                  }
                  placeholder="Leave empty for Close"
                  onChange={(value) =>
                    update(
                      'secondaryHref',
                      value
                    )
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    Popup Delay
                  </label>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={100}
                      value={
                        data.delay
                      }
                      onChange={(event) =>
                        update(
                          'delay',
                          Math.max(
                            0,
                            Math.min(
                              10000,
                              Number(
                                event.target.value
                              ) || 0
                            )
                          )
                        )
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                    />

                    <span className="text-xs text-foreground-muted">
                      ms
                    </span>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4">
                  <input
                    type="checkbox"
                    checked={
                      data.showOncePerSession
                    }
                    onChange={(event) =>
                      update(
                        'showOncePerSession',
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-green-600"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Show once per session
                    </span>

                    <span className="mt-1 block text-xs text-foreground-muted">
                      Disable this while testing.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : 'Save Popup'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent" />

              <h2 className="font-semibold">
                Live Preview
              </h2>
            </div>

            <div className="mt-5 overflow-hidden rounded-[26px] border border-border bg-background p-5 shadow-xl">
              <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-background p-6 shadow-2xl">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>

                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
                      {data.eyebrow ||
                        'AURONIX'}
                    </div>

                    <div className="mt-1 text-lg font-semibold">
                      {data.title ||
                        'Popup Title'}
                    </div>
                  </div>
                </div>

                <p className="relative mt-5 whitespace-pre-line text-sm leading-6 text-foreground-muted">
                  {data.message ||
                    'Your popup message will appear here.'}
                </p>

                <div className="relative mt-6 flex flex-wrap gap-2">
                  {data.buttonText && (
                    <div className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
                      {data.buttonText}
                    </div>
                  )}

                  <div className="rounded-full border border-border px-4 py-2 text-xs font-medium">
                    {data.secondaryText ||
                      'Close'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-secondary p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />

              <p className="text-xs leading-relaxed text-foreground-muted">
                The live popup is shown only on public pages.
                It is hidden automatically from Admin, Seller,
                Partner, and API routes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({
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

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
