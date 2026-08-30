'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  onValue,
  ref,
} from 'firebase/database';

import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { confirmAction, notifyAction, promptAction } from '@/components/ui/confirm-action';

import {
  auth,
  db,
} from '@/lib/firebase';

import { AdminLayout } from '@/components/admin/admin-layout';

import {
  SellerAIScreeningCard,
} from '@/components/admin/seller-ai-screening-card';

type Filter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected';

type SellerApplication = {
  id: string;

  fullName?: unknown;
  businessName?: unknown;
  businessEmail?: unknown;
  phone?: unknown;
  country?: unknown;

  address?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;

  website?: unknown;
  businessType?: unknown;
  yearsInBusiness?: unknown;
  productCategories?: unknown;

  businessInformation?: unknown;
  whyWorkWithAuronix?: unknown;
  catalogUrl?: unknown;

  contactAgreement?: unknown;

  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;

  /*
   * Compatibility fields.
   * These are NOT used as the source of truth for AI display.
   */
  aiStatus?: unknown;
  aiScore?: unknown;
  aiAutoEligible?: unknown;

  aiScreening?: {
    label?: unknown;
    confidence?: unknown;
    score?: unknown;
    summary?: unknown;

    reasons?: unknown;
    positiveSignals?: unknown;
    riskSignals?: unknown;
    missingInformation?: unknown;
    contradictions?: unknown;

    recommendation?: unknown;
    autoEligible?: unknown;

    firstPass?: {
      label?: unknown;
      confidence?: unknown;
    };

    secondPass?: {
      approved?: unknown;
      confidence?: unknown;
    };

    deterministicQuality?: unknown;
    verificationRoutes?: unknown;

    screenedAt?: unknown;
    version?: unknown;
  };

  approvedAt?: unknown;
  approvedBy?: unknown;

  invitationSentAt?: unknown;
  invitationSentBy?: unknown;

  accountCreated?: unknown;
  accountCreationStatus?: unknown;

  aiAutoApproved?: unknown;
  aiAutoApprovedAt?: unknown;

  [key: string]: unknown;
};

function text(
  value: unknown
): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value).trim();
  }

  return '';
}

function getStatus(
  application: SellerApplication
): string {
  return (
    text(
      application.status
    ).toLowerCase() ||
    'pending'
  );
}

function getName(
  application: SellerApplication
): string {
  return (
    text(
      application.fullName
    ) ||
    'Unnamed applicant'
  );
}

function getEmail(
  application: SellerApplication
): string {
  return text(
    application.businessEmail
  );
}

function getCompany(
  application: SellerApplication
): string {
  return text(
    application.businessName
  );
}

function getWebsite(
  application: SellerApplication
): string {
  return text(
    application.website
  );
}

function getBusinessInformation(
  application: SellerApplication
): string {
  return text(
    application.businessInformation
  );
}

function getWhyAuronix(
  application: SellerApplication
): string {
  return text(
    application.whyWorkWithAuronix
  );
}

function getProductCategories(
  application: SellerApplication
): string {
  return text(
    application.productCategories
  );
}

function getScore(
  application: SellerApplication
): number {
  const screening =
    application.aiScreening;

  const confidence =
    Number(
      screening?.confidence
    );

  if (
    Number.isFinite(
      confidence
    )
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          confidence
        )
      )
    );
  }

  /*
   * Compatibility with older records.
   * New display should come from aiScreening.
   */
  const score =
    Number(
      screening?.score
    );

  if (
    Number.isFinite(
      score
    )
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  }

  return 0;
}

function getScreeningLabel(
  application: SellerApplication
): string {
  return (
    text(
      application.aiScreening
        ?.label
    ) ||
    'NOT_SCREENED'
  );
}

function getScreeningClass(
  label: string
): string {
  switch (label) {
    case 'AI_APPROVED':
      return 'border-green-500/20 bg-green-500/10 text-green-700';

    case 'LOOKS_GOOD':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';

    case 'NEEDS_REVIEW':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-700';

    case 'LOOKS_BUG':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-700';

    case 'LOOKS_SPAM':
    case 'HIGH_RISK':
      return 'border-red-500/20 bg-red-500/10 text-red-700';

    default:
      return 'border-border bg-secondary text-foreground-muted';
  }
}

function getScreeningTitle(
  label: string
): string {
  switch (label) {
    case 'AI_APPROVED':
      return 'AI Approved';

    case 'LOOKS_GOOD':
      return 'Looks Good';

    case 'NEEDS_REVIEW':
      return 'Needs Review';

    case 'LOOKS_BUG':
      return 'Looks Bug';

    case 'LOOKS_SPAM':
      return 'Looks Spam';

    case 'HIGH_RISK':
      return 'High Risk';

    default:
      return 'Not Screened';
  }
}

function getListDate(
  application: SellerApplication
): number {
  return Number(
    application.updatedAt ||
      application.createdAt ||
      0
  );
}

function formatDate(
  value: unknown
): string {
  if (!value) {
    return 'Unknown date';
  }

  const timestamp =
    Number(value);

  const date =
    Number.isFinite(
      timestamp
    )
      ? new Date(timestamp)
      : new Date(
          String(value)
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

function normalizeScreening(
  application: SellerApplication
) {
  const screening =
    application.aiScreening;

  if (!screening) {
    return undefined;
  }

  const label =
    text(
      screening.label
    );

  if (
    ![
      'AI_APPROVED',
      'LOOKS_GOOD',
      'NEEDS_REVIEW',
      'LOOKS_BUG',
      'LOOKS_SPAM',
      'HIGH_RISK',
    ].includes(
      label
    )
  ) {
    return undefined;
  }

  const array = (
    value: unknown
  ): string[] =>
    Array.isArray(value)
      ? value
          .map(text)
          .filter(Boolean)
      : [];

  return {
    label:
      label as
        | 'AI_APPROVED'
        | 'LOOKS_GOOD'
        | 'NEEDS_REVIEW'
        | 'LOOKS_BUG'
        | 'LOOKS_SPAM'
        | 'HIGH_RISK',

    score:
      getScore(
        application
      ),

    summary:
      text(
        screening.summary
      ),

    reasons:
      array(
        screening.reasons
      ),

    positiveSignals:
      array(
        screening.positiveSignals
      ),

    riskSignals:
      array(
        screening.riskSignals
      ),

    missingInformation:
      array(
        screening.missingInformation
      ),

    contradictions:
      array(
        screening.contradictions
      ),

    recommendation:
      text(
        screening.recommendation
      ) as
        | 'AUTO_ONBOARD'
        | 'MANUAL_REVIEW'
        | 'DO_NOT_AUTO_APPROVE'
        | undefined,

    autoEligible:
      screening.autoEligible ===
      true,

    screenedAt:
      Number(
        screening.screenedAt
      ) || undefined,

    firstPass:
      screening.firstPass
        ? {
            label:
              text(
                screening.firstPass
                  .label
              ),

            confidence:
              Number(
                screening.firstPass
                  .confidence
              ) || 0,
          }
        : undefined,

    secondPass:
      screening.secondPass
        ? {
            approved:
              screening.secondPass
                .approved ===
              true,

            confidence:
              Number(
                screening.secondPass
                  .confidence
              ) || 0,
          }
        : undefined,

    deterministicQuality:
      Number(
        screening.deterministicQuality
      ) || 0,

    verificationRoutes:
      array(
        screening.verificationRoutes
      ),
  };
}

export default function AdminSellersPage() {
  const [
    applications,
    setApplications,
  ] =
    useState<
      SellerApplication[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      'all'
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(null);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    autoScreening,
    setAutoScreening,
  ] =
    useState(false);

  /*
   * Prevent multiple automatic screening calls during
   * Firebase realtime updates.
   */
  const autoScreenStarted =
    useRef(false);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe =
      onValue(
        ref(
          db,
          'sellerApplications'
        ),
        (snapshot) => {
          const value =
            snapshot.exists()
              ? snapshot.val()
              : {};

          const list =
            Object.entries(
              value || {}
            ).map(
              ([id, item]) => ({
                id,

                ...(item as Record<
                  string,
                  unknown
                >),
              })
            ) as SellerApplication[];

          list.sort(
            (a, b) =>
              getListDate(b) -
              getListDate(a)
          );

          setApplications(
            list
          );

          setLoading(false);
        },
        (error) => {
          console.error(
            'Unable to load seller applications:',
            error
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
   * STEP 2
   *
   * Automatically run the complete server-side screening
   * pipeline when the Seller Applications page is opened.
   */
  useEffect(() => {
    if (
      autoScreenStarted.current
    ) {
      return;
    }

    if (
      !applications.length
    ) {
      return;
    }

    if (
      !auth.currentUser
    ) {
      return;
    }

    autoScreenStarted.current =
      true;

    let cancelled = false;

    async function screenPendingApplications() {
      if (
        cancelled
      ) {
        return;
      }

      setAutoScreening(
        true
      );

      try {
        const token =
          await auth.currentUser!.getIdToken();

        const response =
          await fetch(
            '/api/admin/sellers/ai-screen',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  screenAll:
                    true,

                  automatic:
                    true,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Automatic seller screening failed.'
          );
        }

        console.log(
          'Seller AI screening completed:',
          data
        );
      } catch (error) {
        console.error(
          'Automatic seller screening failed:',
          error
        );
      } finally {
        if (
          !cancelled
        ) {
          setAutoScreening(
            false
          );
        }
      }
    }

    screenPendingApplications();

    return () => {
      cancelled = true;
    };
  }, [
    applications.length,
  ]);

  const selected =
    applications.find(
      (application) =>
        application.id ===
        selectedId
    ) || null;

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return applications.filter(
        (application) => {
          const status =
            getStatus(
              application
            );

          const matchesFilter =
            filter ===
              'all' ||
            status ===
              filter;

          const searchable = [
            getName(
              application
            ),

            getCompany(
              application
            ),

            getEmail(
              application
            ),

            getWebsite(
              application
            ),

            getProductCategories(
              application
            ),

            getBusinessInformation(
              application
            ),

            getWhyAuronix(
              application
            ),
          ]
            .join(' ')
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      applications,
      filter,
      search,
    ]);

  const approveManually =
    async () => {
      if (
        !selected ||
        !auth.currentUser ||
        actionLoading
      ) {
        return;
      }

      if (
        !await confirmAction({
          title: `Approve ${getName(selected)}?`,
          description: 'This approves the application and creates a secure seller account invitation.',
          confirmLabel: 'Approve application',
        })
      ) {
        return;
      }

      setActionLoading(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/sellers/approve',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  applicationId:
                    selected.id,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to approve seller.'
          );
        }

        notifyAction(
          'Seller approved and invitation sent.'
        );
      } catch (error) {
        notifyAction(
          error instanceof Error
            ? error.message
            : 'Unable to approve seller.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const reject =
    async () => {
      if (
        !selected ||
        !auth.currentUser ||
        actionLoading
      ) {
        return;
      }

      const reason =
        await promptAction({
          title: `Reject ${getName(selected)}'s application?`,
          description: 'Provide a professional reason that can be recorded with this decision.',
          label: 'Rejection reason',
          defaultValue: 'The application did not meet the current requirements.',
          confirmLabel: 'Reject application',
          destructive: true,
        });

      if (
        reason === null
      ) {
        return;
      }

      setActionLoading(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/sellers/reject',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  applicationId:
                    selected.id,

                  reason:
                    reason.trim(),
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to reject seller.'
          );
        }
      } catch (error) {
        notifyAction(
          error instanceof Error
            ? error.message
            : 'Unable to reject seller.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const remove =
    async () => {
      if (
        !selected ||
        !auth.currentUser ||
        actionLoading
      ) {
        return;
      }

      if (
        !await confirmAction({
          title: `Delete ${getName(selected)}'s application?`,
          description: 'The seller application will be permanently removed. This action cannot be undone.',
          confirmLabel: 'Delete application',
          destructive: true,
        })
      ) {
        return;
      }

      setActionLoading(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/sellers/delete',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  applicationId:
                    selected.id,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to delete seller application.'
          );
        }

        setSelectedId(
          null
        );
      } catch (error) {
        notifyAction(
          error instanceof Error
            ? error.message
            : 'Unable to delete application.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const runAgain =
    async () => {
      if (
        !selected ||
        !auth.currentUser ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/sellers/ai-screen',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  applicationId:
                    selected.id,

                  /*
                   * Manual re-run should NOT
                   * automatically approve.
                   */
                  automatic:
                    false,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'AI screening failed.'
          );
        }
      } catch (error) {
        notifyAction(
          error instanceof Error
            ? error.message
            : 'AI screening failed.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const counts = {
    all:
      applications.length,

    pending:
      applications.filter(
        (item) =>
          getStatus(item) ===
          'pending'
      ).length,

    approved:
      applications.filter(
        (item) =>
          getStatus(item) ===
          'approved'
      ).length,

    rejected:
      applications.filter(
        (item) =>
          getStatus(item) ===
          'rejected'
      ).length,

    aiApproved:
      applications.filter(
        (item) =>
          getScreeningLabel(
            item
          ) ===
          'AI_APPROVED'
      ).length,

    risk:
      applications.filter(
        (item) => {
          const label =
            getScreeningLabel(
              item
            );

          return (
            label ===
              'HIGH_RISK' ||
            label ===
              'LOOKS_SPAM'
          );
        }
      ).length,
  };

  const screening =
    selected
      ? normalizeScreening(
          selected
        )
      : undefined;

  const address =
    selected
      ? [
          text(
            selected.address
          ),

          text(
            selected.city
          ),

          text(
            selected.state
          ),

          text(
            selected.zipCode
          ),

          text(
            selected.country
          ),
        ]
          .filter(Boolean)
          .join(', ')
      : '';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              AURONIX ADMIN
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Seller Applications
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
              Review seller applications, inspect business information,
              and manage the multi-stage AI screening workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                autoScreening
                  ? 'border-blue-500/20 bg-blue-500/10 text-blue-700'
                  : 'border-border bg-card text-foreground-muted'
              }`}
            >
              {autoScreening ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Screening applications...
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  AI screening active
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Stat
            label="All"
            value={
              counts.all
            }
          />

          <Stat
            label="Pending"
            value={
              counts.pending
            }
          />

          <Stat
            label="Approved"
            value={
              counts.approved
            }
          />

          <Stat
            label="Rejected"
            value={
              counts.rejected
            }
          />

          <Stat
            label="AI Approved"
            value={
              counts.aiApproved
            }
            green
          />

          <Stat
            label="Risk / Spam"
            value={
              counts.risk
            }
            red
          />
        </div>

        {/* SEARCH */}
        <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search applicant, business, email, website..."
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <select
            value={
              filter
            }
            onChange={(
              event
            ) =>
              setFilter(
                event.target.value as Filter
              )
            }
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none"
          >
            <option value="all">
              All Applications
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </div>

        {/* MAIN */}
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          {/* LIST */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="flex min-h-[450px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <User className="mx-auto h-8 w-8 text-foreground-muted" />

                <h2 className="mt-4 font-semibold">
                  No applications
                </h2>

                <p className="mt-2 text-sm text-foreground-muted">
                  No seller applications match the current filter.
                </p>
              </div>
            ) : (
              <div className="max-h-[820px] divide-y divide-border overflow-y-auto">
                {filtered.map(
                  (
                    application
                  ) => {
                    const label =
                      getScreeningLabel(
                        application
                      );

                    const score =
                      getScore(
                        application
                      );

                    return (
                      <button
                        key={
                          application.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedId(
                            application.id
                          )
                        }
                        className={`w-full p-4 text-left transition hover:bg-secondary/40 ${
                          selectedId ===
                          application.id
                            ? 'bg-secondary'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {getName(
                                application
                              )}
                            </div>

                            <div className="mt-1 truncate text-xs text-foreground-muted">
                              {getCompany(
                                application
                              )}
                            </div>

                            <div className="mt-1 truncate text-xs text-foreground-muted">
                              {getEmail(
                                application
                              )}
                            </div>
                          </div>

                          <StatusBadge
                            status={
                              getStatus(
                                application
                              )
                            }
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getScreeningClass(
                              label
                            )}`}
                          >
                            <Bot className="h-3 w-3" />

                            {getScreeningTitle(
                              label
                            )}

                            {label !==
                              'NOT_SCREENED' &&
                            score > 0
                              ? ` · ${score}%`
                              : ''}
                          </span>

                          {screeningAutoEligible(
                            application
                          ) && (
                            <span className="rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-semibold text-white">
                              AUTO ELIGIBLE
                            </span>
                          )}

                          {application.aiAutoApproved ===
                            true && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white">
                              AUTO ONBOARDED
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* DETAIL */}
          <div>
            {!selected ? (
              <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <div>
                  <Bot className="mx-auto h-9 w-9 text-foreground-muted" />

                  <h2 className="mt-4 font-semibold">
                    Select a seller application
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">
                    Select an application to see its complete
                    business information and AI review.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* HEADER */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          status={
                            getStatus(
                              selected
                            )
                          }
                        />

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getScreeningClass(
                            getScreeningLabel(
                              selected
                            )
                          )}`}
                        >
                          <Bot className="h-3 w-3" />

                          {getScreeningTitle(
                            getScreeningLabel(
                              selected
                            )
                          )}

                          {getScore(
                            selected
                          ) > 0
                            ? ` · ${getScore(
                                selected
                              )}%`
                            : ''}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                        {getName(
                          selected
                        )}
                      </h2>

                      <p className="mt-1 text-sm text-foreground-muted">
                        {getCompany(
                          selected
                        )}
                      </p>

                      <p className="mt-1 text-sm text-foreground-muted">
                        Submitted{' '}
                        {formatDate(
                          selected.createdAt
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        runAgain
                      }
                      disabled={
                        actionLoading
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}

                      Run AI Again
                    </button>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
                    <button
                      type="button"
                      onClick={
                        approveManually
                      }
                      disabled={
                        actionLoading ||
                        getStatus(
                          selected
                        ) ===
                          'approved'
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve & Create Account
                    </button>

                    <button
                      type="button"
                      onClick={
                        reject
                      }
                      disabled={
                        actionLoading ||
                        getStatus(
                          selected
                        ) ===
                          'rejected'
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-orange-500/20 px-4 py-2.5 text-sm font-medium text-orange-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={
                        remove
                      }
                      disabled={
                        actionLoading
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* AI CARD */}
                <SellerAIScreeningCard
                  applicationId={
                    selected.id
                  }
                  initialScreening={
                    screening
                  }
                />

                {/* CONTACT */}
                <InfoSection title="Contact Information">
                  <InfoRow
                    icon={
                      <User className="h-4 w-4" />
                    }
                    label="Full Name"
                    value={
                      getName(
                        selected
                      )
                    }
                  />

                  <InfoRow
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                    label="Business Email"
                    value={
                      getEmail(
                        selected
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                    label="Phone"
                    value={
                      text(
                        selected.phone
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={
                      <MapPin className="h-4 w-4" />
                    }
                    label="Country"
                    value={
                      text(
                        selected.country
                      ) ||
                      'Not provided'
                    }
                  />
                </InfoSection>

                {/* ADDRESS */}
                <InfoSection title="Business Address">
                  <InfoRow
                    icon={
                      <MapPin className="h-4 w-4" />
                    }
                    label="Full Address"
                    value={
                      address ||
                      'Not provided'
                    }
                  />

                  <div className="grid gap-0 md:grid-cols-4">
                    <InfoCell
                      label="City"
                      value={
                        text(
                          selected.city
                        ) ||
                        '—'
                      }
                    />

                    <InfoCell
                      label="State / Province"
                      value={
                        text(
                          selected.state
                        ) ||
                        '—'
                      }
                    />

                    <InfoCell
                      label="ZIP / Postal Code"
                      value={
                        text(
                          selected.zipCode
                        ) ||
                        '—'
                      }
                    />

                    <InfoCell
                      label="Country"
                      value={
                        text(
                          selected.country
                        ) ||
                        '—'
                      }
                    />
                  </div>
                </InfoSection>

                {/* BUSINESS */}
                <InfoSection title="Business Information">
                  <InfoRow
                    icon={
                      <Building2 className="h-4 w-4" />
                    }
                    label="Business Name"
                    value={
                      getCompany(
                        selected
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={
                      <Building2 className="h-4 w-4" />
                    }
                    label="Business Type"
                    value={
                      text(
                        selected.businessType
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={
                      <Clock className="h-4 w-4" />
                    }
                    label="Years in Business"
                    value={
                      text(
                        selected.yearsInBusiness
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={
                      <Globe className="h-4 w-4" />
                    }
                    label="Website"
                    value={
                      getWebsite(
                        selected
                      ) ||
                      'Not provided'
                    }
                  />
                </InfoSection>

                {/* PRODUCTS / DESCRIPTION */}
                <InfoSection title="Products & Business Profile">
                  <InfoRow
                    icon={
                      <Sparkles className="h-4 w-4" />
                    }
                    label="Product Categories"
                    value={
                      getProductCategories(
                        selected
                      ) ||
                      'Not provided'
                    }
                  />

                  <InfoBlock
                    label="Business Information"
                    value={
                      getBusinessInformation(
                        selected
                      ) ||
                      'No business information provided.'
                    }
                  />

                  <InfoBlock
                    label="Why do you want to work with Auronix?"
                    value={
                      getWhyAuronix(
                        selected
                      ) ||
                      'No response provided.'
                    }
                  />

                  <InfoRow
                    icon={
                      <Globe className="h-4 w-4" />
                    }
                    label="Catalog URL"
                    value={
                      text(
                        selected.catalogUrl
                      ) ||
                      'Not provided'
                    }
                  />
                </InfoSection>

                {/* VERIFICATION INFO */}
                <InfoSection title="Verification Pipeline">
                  <InfoRow
                    icon={
                      <Bot className="h-4 w-4" />
                    }
                    label="AI Result"
                    value={
                      screening
                        ? `${getScreeningTitle(
                            screening.label
                          )} · ${screening.score}%`
                        : 'Not screened'
                    }
                  />

                  <InfoRow
                    icon={
                      <ShieldAlert className="h-4 w-4" />
                    }
                    label="Deterministic Quality"
                    value={
                      screening
                        ? `${screening.deterministicQuality}/100`
                        : 'Not available'
                    }
                  />

                  <InfoRow
                    icon={
                      <Bot className="h-4 w-4" />
                    }
                    label="First AI Review"
                    value={
                      screening?.firstPass
                        ? `${screening.firstPass.label} · ${screening.firstPass.confidence}%`
                        : 'Not available'
                    }
                  />

                  <InfoRow
                    icon={
                      <ShieldAlert className="h-4 w-4" />
                    }
                    label="Second AI Verification"
                    value={
                      screening?.secondPass
                        ? `${screening.secondPass.approved ? 'Passed' : 'Failed'} · ${screening.secondPass.confidence}%`
                        : 'Not triggered'
                    }
                  />

                  <InfoRow
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    label="Automatic Onboarding"
                    value={
                      screening?.autoEligible
                        ? 'Eligible'
                        : 'Not eligible'
                    }
                  />

                  <InfoRow
                    icon={
                      <Clock className="h-4 w-4" />
                    }
                    label="Screened At"
                    value={
                      screening?.screenedAt
                        ? formatDate(
                            screening.screenedAt
                          )
                        : 'Not screened'
                    }
                  />
                </InfoSection>

                {/* AUTO APPROVAL STATUS */}
                {selected.aiAutoApproved ===
                  true && (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />

                      <div>
                        <h3 className="font-semibold text-green-700">
                          Automatically Onboarded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-green-700/80">
                          This application passed the configured
                          two-stage AI verification pipeline and
                          was automatically approved.
                        </p>

                        {Boolean(selected.invitationSentAt) && (
                          <p className="mt-2 text-xs text-green-700/70">
                            Invitation sent{' '}
                            {formatDate(
                              selected.invitationSentAt
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* DISCLAIMER */}
                <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-xs leading-5 text-foreground-muted">
                  AI screening is an internal business-application
                  quality and risk assessment. It does not by itself
                  establish legal identity, ownership, licensing, or
                  real-world business authenticity.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function screeningAutoEligible(
  application: SellerApplication
): boolean {
  return (
    application.aiScreening
      ?.autoEligible ===
    true
  );
}

function Stat({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-5 ${
        green
          ? 'border-green-500/20'
          : red
            ? 'border-red-500/20'
            : 'border-border'
      }`}
    >
      <div
        className={`text-2xl font-semibold ${
          green
            ? 'text-green-700'
            : red
              ? 'text-red-700'
              : ''
        }`}
      >
        {value}
      </div>

      <div className="mt-1 text-sm text-foreground-muted">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let className =
    'border-border bg-secondary text-foreground-muted';

  if (
    status ===
    'approved'
  ) {
    className =
      'border-green-500/20 bg-green-500/10 text-green-700';
  }

  if (
    status ===
    'pending'
  ) {
    className =
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-700';
  }

  if (
    status ===
    'rejected'
  ) {
    className =
      'border-red-500/20 bg-red-500/10 text-red-700';
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {status}
    </span>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">
          {title}
        </h3>
      </div>

      <div className="divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4 px-5 py-4">
      <div className="mt-0.5 text-foreground-muted">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-foreground-muted">
          {label}
        </div>

        <div className="mt-1 break-words text-sm">
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-foreground-muted">
        {label}
      </div>

      <div className="mt-1 text-sm">
        {value}
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-5 py-5">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
        {value}
      </div>
    </div>
  );
}

