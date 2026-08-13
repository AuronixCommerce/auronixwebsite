'use client';

import { useEffect, useState } from 'react';
import {
  Ban,
  Clock3,
  Mail,
  ShieldAlert,
} from 'lucide-react';

interface AccountRestrictionProps {
  permanent: boolean;
  until?: number | null;
  reason?: string;
  onSignOut: () => Promise<void> | void;
}

export function AccountRestriction({
  permanent,
  until,
  reason,
  onSignOut,
}: AccountRestrictionProps) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Number(until || 0) - Date.now())
  );

  useEffect(() => {
    if (permanent || !until) return;

    const interval = window.setInterval(() => {
      setRemaining(
        Math.max(0, until - Date.now())
      );
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [permanent, until]);

  if (!permanent && remaining <= 0) {
    return null;
  }

  if (permanent) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-red-500/20 bg-card p-8 lg:p-10 text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>

            <div className="mt-6 text-xs uppercase tracking-[0.15em] font-semibold text-red-600">
              Account Restricted
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Access is permanently restricted
            </h1>

            <p className="mt-4 text-sm lg:text-base text-foreground-muted leading-relaxed">
              Your Auronix Commerce account is currently
              restricted from accessing the platform.
            </p>

            {reason && (
              <div className="mt-6 rounded-2xl bg-secondary text-left p-5">
                <div className="text-xs uppercase tracking-wider text-foreground-muted mb-2">
                  Reason
                </div>

                <p className="text-sm leading-relaxed">
                  {reason}
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/support"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>

              <button
                onClick={onSignOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl border border-yellow-500/20 bg-card p-8 lg:p-10 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Clock3 className="w-8 h-8 text-yellow-600" />
          </div>

          <div className="mt-6 text-xs uppercase tracking-[0.15em] font-semibold text-yellow-700">
            Temporary Restriction
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Access temporarily restricted
          </h1>

          <p className="mt-4 text-sm lg:text-base text-foreground-muted leading-relaxed">
            Your account will become available automatically
            when the restriction period ends.
          </p>

          <div className="mt-8 grid grid-cols-4 gap-2">
            {formatRemaining(remaining).map(
              (item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-secondary p-4"
                >
                  <div className="text-2xl font-semibold tabular-nums">
                    {item.value}
                  </div>

                  <div className="text-[10px] uppercase tracking-wider text-foreground-muted mt-1">
                    {item.label}
                  </div>
                </div>
              )
            )}
          </div>

          {reason && (
            <div className="mt-6 rounded-2xl bg-secondary text-left p-5">
              <div className="text-xs uppercase tracking-wider text-foreground-muted mb-2">
                Reason
              </div>

              <p className="text-sm leading-relaxed">
                {reason}
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/support"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>

            <button
              onClick={onSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <Ban className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.floor(
    Math.max(0, ms) / 1000
  );

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return [
    {
      label: 'Days',
      value: String(days).padStart(2, '0'),
    },
    {
      label: 'Hours',
      value: String(hours).padStart(2, '0'),
    },
    {
      label: 'Minutes',
      value: String(minutes).padStart(2, '0'),
    },
    {
      label: 'Seconds',
      value: String(seconds).padStart(2, '0'),
    },
  ];
}
