'use client';
import { Spinner } from '@/components/design/primitives';

import {
  useState,
} from 'react';

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';

import {
  auth,
} from '@/lib/firebase';

type Label =
  | 'AI_APPROVED'
  | 'LOOKS_GOOD'
  | 'NEEDS_REVIEW'
  | 'LOOKS_BUG'
  | 'LOOKS_SPAM'
  | 'HIGH_RISK';

type Recommendation =
  | 'AUTO_ONBOARD'
  | 'MANUAL_REVIEW'
  | 'DO_NOT_AUTO_APPROVE';

type Screening = {
  label: Label;

  score: number;

  summary: string;

  reasons: string[];

  positiveSignals: string[];

  riskSignals: string[];

  missingInformation: string[];

  contradictions: string[];

  recommendation?: Recommendation;

  autoEligible: boolean;

  screenedAt?: number;

  firstPass?: {
    label: string;
    confidence: number;
  };

  secondPass?: {
    approved: boolean;
    confidence: number;
  };

  deterministicQuality: number;

  verificationRoutes: string[];
};

interface Props {
  applicationId: string;

  initialScreening?:
    | Screening
    | undefined;
}

const LABEL_CONFIG: Record<
  Label,
  {
    title: string;
    description: string;
    className: string;
    icon:
      | typeof CheckCircle2
      | typeof AlertTriangle
      | typeof XCircle
      | typeof ShieldAlert;
  }
> = {
  AI_APPROVED: {
    title:
      'AI Approved',
    description:
      'Passed the configured multi-stage screening pipeline.',
    className:
      'border-green-500/20 bg-green-500/5 text-green-700',
    icon:
      CheckCircle2,
  },

  LOOKS_GOOD: {
    title:
      'Looks Good',
    description:
      'Looks strong, but automatic onboarding requirements were not fully satisfied.',
    className:
      'border-emerald-500/20 bg-emerald-500/5 text-emerald-700',
    icon:
      CheckCircle2,
  },

  NEEDS_REVIEW: {
    title:
      'Needs Review',
    description:
      'A human review is recommended before approval.',
    className:
      'border-yellow-500/20 bg-yellow-500/5 text-yellow-700',
    icon:
      AlertTriangle,
  },

  LOOKS_BUG: {
    title:
      'Looks Bug',
    description:
      'The application appears incomplete or malformed.',
    className:
      'border-orange-500/20 bg-orange-500/5 text-orange-700',
    icon:
      AlertTriangle,
  },

  LOOKS_SPAM: {
    title:
      'Looks Spam',
    description:
      'Strong spam-like indicators were detected.',
    className:
      'border-red-500/20 bg-red-500/5 text-red-700',
    icon:
      XCircle,
  },

  HIGH_RISK: {
    title:
      'High Risk',
    description:
      'Strong risk or security indicators were detected.',
    className:
      'border-red-500/20 bg-red-500/5 text-red-700',
    icon:
      ShieldAlert,
  },
};

export function SellerAIScreeningCard({
  applicationId,
  initialScreening,
}: Props) {
  const [
    screening,
    setScreening,
  ] =
    useState<
      Screening | undefined
    >(
      initialScreening
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const runAgain =
    async () => {
      if (
        !auth.currentUser ||
        loading
      ) {
        return;
      }

      setLoading(
        true
      );

      setError('');

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
                  applicationId,

                  /*
                   * Manual re-run only evaluates.
                   * It cannot auto-approve.
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

        setScreening(
          data.screening
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'AI screening failed.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  const config =
    screening
      ? LABEL_CONFIG[
          screening.label
        ]
      : null;

  const Icon =
    config?.icon ||
    Bot;

  return (
    <section className="overflow-hidden ac-content-panel">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold">
              AI Application Review
            </h3>

            <p className="mt-1 text-xs text-foreground-muted">
              Two-stage AI verification + deterministic checks
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            runAgain
          }
          disabled={
            loading
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
        >
          {loading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}

          {loading
            ? 'Running...'
            : screening
              ? 'Run Again'
              : 'AI Screen'}
        </button>
      </div>

      <div className="space-y-5 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!screening ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-foreground-muted" />

            <p className="mt-3 text-sm font-medium">
              No AI screening result yet.
            </p>

            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              The Seller Applications page automatically runs the
              screening pipeline when opened.
            </p>
          </div>
        ) : (
          <>
            {/* RESULT */}
            <div
              className={`rounded-2xl border p-5 ${config?.className}`}
            >
              <div className="flex items-start gap-4">
                <Icon className="mt-0.5 h-6 w-6 shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-semibold">
                      {config?.title}
                    </h4>

                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                      {screening.score}%
                      confidence
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6">
                    {screening.summary}
                  </p>

                  {screening.autoEligible && (
                    <div className="mt-4 inline-flex rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Automatic onboarding eligible
                    </div>
                  )}

                  {screening.recommendation && (
                    <div className="mt-3 text-xs font-medium uppercase tracking-wide opacity-80">
                      Recommendation:{' '}
                      {screening.recommendation.replace(
                        /_/g,
                        ' '
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* VERIFICATION SUMMARY */}
            <div className="grid gap-3 md:grid-cols-4">
              <VerificationBox
                label="Deterministic Quality"
                value={`${screening.deterministicQuality}/100`}
              />

              <VerificationBox
                label="First AI Review"
                value={
                  screening.firstPass
                    ? `${screening.firstPass.label} · ${screening.firstPass.confidence}%`
                    : 'Not run'
                }
              />

              <VerificationBox
                label="Second AI Review"
                value={
                  screening.secondPass
                    ? `${
                        screening.secondPass.approved
                          ? 'PASS'
                          : 'FAIL'
                      } · ${screening.secondPass.confidence}%`
                    : 'Not triggered'
                }
              />

              <VerificationBox
                label="Routes"
                value={
                  screening.verificationRoutes
                    .length
                    ? String(
                        screening.verificationRoutes
                          .length
                      )
                    : '1'
                }
              />
            </div>

            {/* SIGNALS */}
            <div className="grid gap-4 md:grid-cols-2">
              <SignalList
                title="Positive Signals"
                items={
                  screening.positiveSignals
                }
                empty="No notable positive signals."
                type="positive"
              />

              <SignalList
                title="Risk Signals"
                items={
                  screening.riskSignals
                }
                empty="No significant risk signals."
                type="risk"
              />

              <SignalList
                title="Missing Information"
                items={
                  screening.missingInformation
                }
                empty="No required information is missing."
                type="warning"
              />

              <SignalList
                title="Contradictions"
                items={
                  screening.contradictions
                }
                empty="No internal contradictions detected."
                type="risk"
              />
            </div>

            {/* REASONS */}
            {screening.reasons.length >
              0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <h4 className="text-sm font-semibold">
                  AI Reasoning Summary
                </h4>

                <ul className="mt-3 space-y-2">
                  {screening.reasons.map(
                    (
                      reason,
                      index
                    ) => (
                      <li
                        key={`${reason}-${index}`}
                        className="flex gap-2 text-sm leading-6 text-foreground-muted"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />

                        <span>
                          {reason}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* AUTO APPROVAL */}
            {screening.autoEligible && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                  <div>
                    <h4 className="font-semibold text-green-700">
                      Passed automatic onboarding gate
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-green-700/80">
                      The first AI review, independent second AI
                      verification, deterministic validation, and risk
                      checks all passed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RISK WARNING */}
            {(screening.label ===
              'HIGH_RISK' ||
              screening.label ===
                'LOOKS_SPAM') && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <div>
                    <h4 className="font-semibold text-red-700">
                      Automatic onboarding blocked
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-red-700/80">
                      Risk indicators require manual review. The
                      application will not be automatically approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DISCLAIMER */}
            <div className="rounded-xl border border-border p-4 text-xs leading-5 text-foreground-muted">
              AI screening is an internal business-application
              assessment. It does not independently prove legal
              identity, ownership, licensing, or real-world business
              authenticity.
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function VerificationBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        {label}
      </div>

      <div className="mt-2 text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}

function SignalList({
  title,
  items,
  empty,
  type,
}: {
  title: string;
  items: string[];
  empty: string;
  type:
    | 'positive'
    | 'risk'
    | 'warning';
}) {
  const bullet =
    type === 'positive'
      ? 'bg-green-500'
      : type === 'risk'
        ? 'bg-red-500'
        : 'bg-yellow-500';

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-sm font-semibold">
        {title}
      </h4>

      {items.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-foreground-muted">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map(
            (
              item,
              index
            ) => (
              <li
                key={`${item}-${index}`}
                className="flex gap-2 text-xs leading-5 text-foreground-muted"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bullet}`}
                />

                <span>
                  {item}
                </span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
