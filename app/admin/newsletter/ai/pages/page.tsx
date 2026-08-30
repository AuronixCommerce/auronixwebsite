'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ReactNode,
} from 'react';

import Link from 'next/link';
import { confirmAction } from '@/components/ui/confirm-action';

import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  auth,
} from '@/lib/firebase';

import {
  AdminLayout,
} from '@/components/admin/admin-layout';

type ActivityItem = {
  id: string;
  type: string;
  createdAt: number;
  referrer: string | null;
  expiresAt: number | null;
};

type AiGeneratedPage = {
  token: string;
  url: string;
  campaignId: string | null;
  campaignName: string;
  pageType: string;
  label: string;
  title: string;
  content: string;
  destinationPath: string;
  formEnabled: boolean;
  createdAt: number;
  expiresAt: number;
  active: boolean;

  status:
    | 'active'
    | 'expired'
    | 'disabled';

  viewCount: number;

  reservationCount: number;

  lastViewedAt:
    | number
    | null;

  lastReferrer:
    | string
    | null;

  disabledAt:
    | number
    | null;

  source: string;

  activity: ActivityItem[];
};

type Summary = {
  total: number;
  active: number;
  expired: number;
  disabled: number;
  views: number;
  reservations: number;
};

function formatDate(
  value: unknown
): string {
  const timestamp =
    Number(value);

  if (
    !Number.isFinite(
      timestamp
    ) ||
    timestamp <= 0
  ) {
    return '—';
  }

  return new Date(
    timestamp
  ).toLocaleString(
    'en-US',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
    }
  );
}

function statusStyles(
  status:
    | 'active'
    | 'expired'
    | 'disabled'
) {
  if (
    status ===
    'active'
  ) {
    return 'bg-green-500/10 text-green-700';
  }

  if (
    status ===
    'expired'
  ) {
    return 'bg-amber-500/10 text-amber-700';
  }

  return 'bg-red-500/10 text-red-700';
}

function statusText(
  status:
    | 'active'
    | 'expired'
    | 'disabled'
) {
  if (
    status ===
    'active'
  ) {
    return 'ACTIVE';
  }

  if (
    status ===
    'expired'
  ) {
    return 'EXPIRED';
  }

  return 'DISABLED';
}

export default function AdminAiNewsletterPagesPage() {
  const [
    pages,
    setPages,
  ] =
    useState<
      AiGeneratedPage[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<Summary>({
      total:
        0,

      active:
        0,

      expired:
        0,

      disabled:
        0,

      views:
        0,

      reservations:
        0,
    });

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    selectedToken,
    setSelectedToken,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    deleting,
    setDeleting,
  ] =
    useState<
      string | null
    >(null);

  const [
    notice,
    setNotice,
  ] =
    useState('');

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          setNotice('');

          const user =
            auth.currentUser;

          if (
            !user
          ) {
            throw new Error(
              'Your admin session has expired. Please sign in again.'
            );
          }

          const token =
            await user.getIdToken();

          const response =
            await fetch(
              '/api/admin/newsletter/ai-pages',
              {
                method:
                  'GET',

                headers: {
                  Authorization:
                    'Bearer ' +
                    token,
                },

                cache:
                  'no-store',
              }
            );

          const contentType =
            response.headers.get(
              'content-type'
            ) ||
            '';

          if (
            !contentType.includes(
              'application/json'
            )
          ) {
            const raw =
              await response.text();

            throw new Error(
              'AI pages API returned an unexpected response (' +
                response.status +
                '): ' +
                raw.slice(
                  0,
                  200
                )
            );
          }

          const data =
            await response.json();

          if (
            !response.ok ||
            data?.success !==
              true
          ) {
            throw new Error(
              data?.error ||
                'Unable to load AI generated pages.'
            );
          }

          const loaded =
            Array.isArray(
              data.pages
            )
              ? data.pages
              : [];

          setPages(
            loaded
          );

          setSummary({
            total:
              Number(
                data.summary?.total ||
                  0
              ),

            active:
              Number(
                data.summary?.active ||
                  0
              ),

            expired:
              Number(
                data.summary?.expired ||
                  0
              ),

            disabled:
              Number(
                data.summary?.disabled ||
                  0
              ),

            views:
              Number(
                data.summary?.views ||
                  0
              ),

            reservations:
              Number(
                data.summary?.reservations ||
                  0
              ),
          });

          if (
            selectedToken
          ) {
            const stillExists =
              loaded.some(
                (
                  page: AiGeneratedPage
                ) =>
                  page.token ===
                  selectedToken
              );

            if (
              !stillExists
            ) {
              setSelectedToken(
                null
              );
            }
          }
        } catch (
          error
        ) {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Unable to load AI generated pages.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectedToken,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  const filtered =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (
          !term
        ) {
          return pages;
        }

        return pages.filter(
          (
            page
          ) =>
            page.token
              .toLowerCase()
              .includes(
                term
              ) ||
            page.title
              .toLowerCase()
              .includes(
                term
              ) ||
            page.label
              .toLowerCase()
              .includes(
                term
              ) ||
            page.campaignName
              .toLowerCase()
              .includes(
                term
              ) ||
            page.pageType
              .toLowerCase()
              .includes(
                term
              ) ||
            page.destinationPath
              .toLowerCase()
              .includes(
                term
              ) ||
            (
              page.campaignId ||
              ''
            )
              .toLowerCase()
              .includes(
                term
              ) ||
            page.status
              .toLowerCase()
              .includes(
                term
              )
        );
      },
      [
        pages,
        search,
      ]
    );

  const selected =
    pages.find(
      (
        page
      ) =>
        page.token ===
        selectedToken
    ) ||
    null;

  const deleteAiPage =
    async (
      tokenValue: string,
      title: string
    ) => {
      const confirmed =
        await confirmAction({
          title: `Delete “${title || 'this campaign page'}”?`,
          description: 'This permanently removes the temporary URL and its activity history. The original newsletter campaign will remain.',
          confirmLabel: 'Delete page',
          destructive: true,
        });

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setDeleting(
          tokenValue
        );

        setNotice('');

        const user =
          auth.currentUser;

        if (
          !user
        ) {
          throw new Error(
            'Your admin session has expired. Please sign in again.'
          );
        }

        const authToken =
          await user.getIdToken();

        const response =
          await fetch(
            '/api/admin/newsletter/delete',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  'Bearer ' +
                  authToken,
              },

              body:
                JSON.stringify({
                  mode:
                    'page',

                  token:
                    tokenValue,
                }),
            }
          );

        const contentType =
          response.headers.get(
            'content-type'
          ) ||
          '';

        if (
          !contentType.includes(
            'application/json'
          )
        ) {
          const raw =
            await response.text();

          throw new Error(
            'Delete API returned an unexpected response (' +
              response.status +
              '): ' +
              raw.slice(
                0,
                200
              )
          );
        }

        const data =
          await response.json();

        if (
          !response.ok ||
          data?.success !==
            true
        ) {
          throw new Error(
            data?.error ||
              'Unable to delete AI generated page.'
          );
        }

        setPages(
          current =>
            current.filter(
              page =>
                page.token !==
                tokenValue
            )
        );

        if (
          selectedToken ===
          tokenValue
        ) {
          setSelectedToken(
            null
          );
        }

        setNotice(
          'AI generated page deleted successfully.'
        );

        await load();
      } catch (
        error
      ) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Unable to delete AI generated page.'
        );
      } finally {
        setDeleting(
          null
        );
      }
    };

  return (
    <AdminLayout>

      <div className="space-y-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              AURONIX AI
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              AI Generated Pages
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
              Monitor every temporary campaign page
              created by newsletter AI, including
              campaign details, generated URLs,
              expiration, views, forms, reservations,
              and activity history.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                load
              }
              disabled={
                loading
              }
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
            >

              <RefreshCw
                className={
                  loading
                    ? 'h-4 w-4 animate-spin'
                    : 'h-4 w-4'
                }
              />

              Refresh

            </button>

            <Link
              href="/admin/newsletter"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Newsletter Manager
            </Link>

          </div>

        </div>

        {notice && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            {notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <Stat
            icon={
              <BarChart3 className="h-4 w-4" />
            }
            label="Total"
            value={
              summary.total
            }
          />

          <Stat
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Active"
            value={
              summary.active
            }
          />

          <Stat
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Expired"
            value={
              summary.expired
            }
          />

          <Stat
            icon={
              <XCircle className="h-4 w-4" />
            }
            label="Disabled"
            value={
              summary.disabled
            }
          />

          <Stat
            icon={
              <Eye className="h-4 w-4" />
            }
            label="Views"
            value={
              summary.views
            }
          />

          <Stat
            icon={
              <Activity className="h-4 w-4" />
            }
            label="Reservations"
            value={
              summary.reservations
            }
          />

        </div>

        <div className="relative">

          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />

          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Search campaign, title, token, type, or destination..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
          />

        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">

          <section className="overflow-hidden rounded-3xl border border-border bg-card">

            <div className="border-b border-border p-5">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="font-semibold">
                    AI Campaign Pages
                  </h2>

                  <p className="mt-1 text-xs text-foreground-muted">
                    {
                      filtered.length
                    }
                    {' '}
                    result{filtered.length === 1 ? '' : 's'}
                  </p>

                </div>

                <Activity className="h-5 w-5 text-foreground-muted" />

              </div>

            </div>

            {loading ? (
              <div className="flex min-h-[430px] items-center justify-center gap-2 text-sm text-foreground-muted">

                <Loader2 className="h-5 w-5 animate-spin" />

                Loading AI pages...

              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <Sparkles className="h-6 w-6" />
                </div>

                <h3 className="mt-4 font-semibold">
                  No AI generated pages
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-foreground-muted">
                  Generate a newsletter campaign with
                  AI and its campaign page will appear
                  here automatically.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-border">

                {filtered.map(
                  page => (
                    <button
                      type="button"
                      key={
                        page.token
                      }
                      onClick={() =>
                        setSelectedToken(
                          page.token
                        )
                      }
                      className={
                        'w-full p-5 text-left transition hover:bg-secondary/30 ' +
                        (
                          selectedToken ===
                          page.token
                            ? 'bg-secondary/30'
                            : ''
                        )
                      }
                    >

                      <div className="flex items-start justify-between gap-5">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={
                                'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ' +
                                statusStyles(
                                  page.status
                                )
                              }
                            >
                              {
                                statusText(
                                  page.status
                                )
                              }
                            </span>

                            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground-muted">
                              {
                                page.pageType ||
                                'general'
                              }
                            </span>

                          </div>

                          <div className="mt-3 line-clamp-2 font-semibold">
                            {
                              page.campaignName ||
                              page.title ||
                              page.label ||
                              'Untitled AI campaign'
                            }
                          </div>

                          <div className="mt-1 line-clamp-1 text-xs text-foreground-muted">
                            {
                              page.title ||
                              'AI campaign page'
                            }
                          </div>

                          <div className="mt-1 font-mono text-[10px] text-foreground-muted">
                            /go/{page.token}
                          </div>

                        </div>

                        <div className="shrink-0 text-right">

                          <div className="flex items-center justify-end gap-1.5 text-sm font-bold">
                            <Eye className="h-3.5 w-3.5" />
                            {
                              page.viewCount
                            }
                          </div>

                          <div className="mt-1 text-[10px] text-foreground-muted">
                            views
                          </div>

                        </div>

                      </div>

                      <div className="mt-4 grid gap-2 text-[11px] text-foreground-muted sm:grid-cols-3">

                        <div>
                          Created:
                          {' '}
                          {
                            formatDate(
                              page.createdAt
                            )
                          }
                        </div>

                        <div>
                          Expires:
                          {' '}
                          {
                            formatDate(
                              page.expiresAt
                            )
                          }
                        </div>

                        <div>
                          Reservations:
                          {' '}
                          {
                            page.reservationCount
                          }
                        </div>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

          </section>

          <section className="rounded-3xl border border-border bg-card p-6">

            {!selected ? (
              <div className="flex min-h-[560px] items-center justify-center text-center">

                <div>

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <Activity className="h-6 w-6" />
                  </div>

                  <h2 className="mt-5 font-semibold">
                    Select a generated campaign
                  </h2>

                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-foreground-muted">
                    Select a campaign to see its generated
                    page, URL, campaign ID, form state,
                    views, reservations, and activity.
                  </p>

                </div>

              </div>
            ) : (
              <div>

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI CAMPAIGN
                    </div>

                    <h2 className="mt-2 text-xl font-semibold tracking-tight">
                      {
                        selected.campaignName ||
                        selected.title ||
                        'AI Generated Campaign'
                      }
                    </h2>

                  </div>

                  <span
                    className={
                      'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ' +
                      statusStyles(
                        selected.status
                      )
                    }
                  >
                    {
                      statusText(
                        selected.status
                      )
                    }
                  </span>

                </div>

                <div className="mt-6 space-y-3">

                  <Detail
                    label="Campaign Name"
                    value={
                      selected.campaignName ||
                      '—'
                    }
                  />

                  <Detail
                    label="Campaign Type"
                    value={
                      selected.pageType ||
                      'general'
                    }
                  />

                  <Detail
                    label="Temporary URL"
                    value={
                      selected.url
                    }
                    link={
                      selected.url
                    }
                  />

                  <Detail
                    label="Token"
                    value={
                      selected.token
                    }
                    mono
                  />

                  <Detail
                    label="Campaign ID"
                    value={
                      selected.campaignId ||
                      'Not attached'
                    }
                    mono
                  />

                  <Detail
                    label="Requested Destination"
                    value={
                      selected.destinationPath ||
                      '/'
                    }
                    mono
                  />

                  <Detail
                    label="Form"
                    value={
                      selected.formEnabled
                        ? 'Enabled'
                        : 'Not enabled'
                    }
                  />

                  <Detail
                    label="Created"
                    value={
                      formatDate(
                        selected.createdAt
                      )
                    }
                  />

                  <Detail
                    label="Expires"
                    value={
                      formatDate(
                        selected.expiresAt
                      )
                    }
                  />

                  <Detail
                    label="Views"
                    value={
                      String(
                        selected.viewCount
                      )
                    }
                  />

                  <Detail
                    label="Reservations"
                    value={
                      String(
                        selected.reservationCount
                      )
                    }
                  />

                  <Detail
                    label="Last Viewed"
                    value={
                      formatDate(
                        selected.lastViewedAt
                      )
                    }
                  />

                </div>

                <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-4">

                  <div className="flex items-center gap-2">

                    <Activity className="h-4 w-4" />

                    <h3 className="text-sm font-semibold">
                      Activity History
                    </h3>

                  </div>

                  <div className="mt-4 space-y-3">

                    {selected.activity.length > 0 ? (
                      selected.activity.map(
                        activity => (
                          <div
                            key={
                              activity.id
                            }
                            className="rounded-xl border border-border bg-card p-3"
                          >

                            <div className="flex items-center justify-between gap-3">

                              <span className="text-xs font-bold uppercase tracking-[0.1em]">
                                {
                                  activity.type
                                }
                              </span>

                              <span className="text-[10px] text-foreground-muted">
                                {
                                  formatDate(
                                    activity.createdAt
                                  )
                                }
                              </span>

                            </div>

                            {activity.referrer && (
                              <div className="mt-2 break-all text-[11px] text-foreground-muted">
                                Referrer:
                                {' '}
                                {
                                  activity.referrer
                                }
                              </div>
                            )}

                          </div>
                        )
                      )
                    ) : (
                      <div className="py-4 text-xs text-foreground-muted">
                        No activity recorded yet.
                      </div>
                    )}

                  </div>

                </div>

                <div className="mt-6 flex flex-wrap gap-3">

                  <a
                    href={
                      selected.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Campaign
                  </a>

                  <button
                    type="button"
                    disabled={
                      deleting ===
                      selected.token
                    }
                    onClick={() =>
                      deleteAiPage(
                        selected.token,
                        selected.campaignName ||
                          selected.title ||
                          selected.label ||
                          'AI Generated Page'
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {deleting ===
                    selected.token ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {deleting ===
                    selected.token
                      ? 'Deleting...'
                      : 'Delete Page'}

                  </button>

                </div>

              </div>
            )}

          </section>

        </div>

      </div>
    </AdminLayout>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
        {icon}
      </div>

      <div className="mt-4 text-2xl font-bold">
        {
          value
        }
      </div>

      <div className="mt-1 text-xs text-foreground-muted">
        {
          label
        }
      </div>

    </div>
  );
}

function Detail({
  label,
  value,
  link,
  mono,
}: {
  label: string;
  value: string;
  link?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4">

      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground-muted">
        {
          label
        }
      </div>

      {link ? (
        <a
          href={
            link
          }
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-semibold underline underline-offset-4"
        >
          {
            value
          }
        </a>
      ) : (
        <div
          className={
            'mt-2 break-all text-sm font-semibold ' +
            (
              mono
                ? 'font-mono text-xs'
                : ''
            )
          }
        >
          {
            value
          }
        </div>
      )}

    </div>
  );
}
