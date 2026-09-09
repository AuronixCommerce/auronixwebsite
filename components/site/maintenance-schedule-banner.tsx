'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CalendarClock,
  CheckCircle2,
  ChevronUp,
  Clock3,
  X,
} from 'lucide-react';

type ScheduleData = {
  enabled: boolean;
  startAt: number | null;
  endAt: number | null;
  upcoming: boolean;
  active: boolean;
};

type Props = {
  schedule: ScheduleData | null;
  scope: 'global' | 'page';
  pageTitle?: string;
  initiallyVisible?: boolean;
};

function formatDate(
  timestamp: number | null | undefined
) {
  if (!timestamp) {
    return '';
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(
    new Date(timestamp)
  );
}

function formatRemaining(
  milliseconds: number
) {
  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        milliseconds / 1000
      )
    );

  const days =
    Math.floor(
      totalSeconds / 86400
    );

  const hours =
    Math.floor(
      (totalSeconds % 86400) / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(
      hours
    ).padStart(
      2,
      '0'
    )}h ${String(
      minutes
    ).padStart(
      2,
      '0'
    )}m`;
  }

  return `${String(
    hours
  ).padStart(
    2,
    '0'
  )}:${String(
    minutes
  ).padStart(
    2,
    '0'
  )}:${String(
    seconds
  ).padStart(
    2,
    '0'
  )}`;
}

export function MaintenanceScheduleBanner({
  schedule,
  scope,
  pageTitle,
  initiallyVisible = true,
}: Props) {
  const [
    now,
    setNow,
  ] = useState(
    Date.now()
  );

  const [
    visible,
    setVisible,
  ] = useState(
    initiallyVisible
  );

  const [
    introVisible,
    setIntroVisible,
  ] = useState(true);

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setNow(
            Date.now()
          );
        },
        1000
      );

    const introTimer =
      window.setTimeout(
        () => {
          setIntroVisible(
            false
          );
        },
        20000
      );

    return () => {
      window.clearInterval(
        interval
      );

      window.clearTimeout(
        introTimer
      );
    };
  }, []);

  const status =
    useMemo<
      'none' | 'upcoming' | 'active' | 'finished'
    >(() => {
      if (
        !schedule ||
        !schedule.enabled
      ) {
        return 'none';
      }

      if (
        schedule.startAt &&
        now <
          schedule.startAt
      ) {
        return 'upcoming';
      }

      if (
        schedule.startAt &&
        now >=
          schedule.startAt &&
        (
          !schedule.endAt ||
          now <
            schedule.endAt
        )
      ) {
        return 'active';
      }

      return 'finished';
    }, [
      schedule,
      now,
    ]);

  if (
    !schedule ||
    status === 'none' ||
    status === 'finished'
  ) {
    return null;
  }

  const activeSchedule =
    schedule;

  const endRemaining =
    activeSchedule.endAt
      ? activeSchedule.endAt -
        now
      : null;

  const startRemaining =
    activeSchedule.startAt
      ? activeSchedule.startAt -
        now
      : null;

  const isGlobal =
    scope === 'global';

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() =>
          setVisible(true)
        }
        className="fixed bottom-[92px] right-5 z-[9990] inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-xl backdrop-blur-xl"
      >
        <CalendarClock className="h-4 w-4 text-accent" />

        Maintenance schedule

        <ChevronUp className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[86px] right-4 z-[9990] w-[min(420px,calc(100vw-32px))]">
      <div className="relative overflow-hidden ac-content-panel/95 p-4 shadow-2xl backdrop-blur-2xl">

        <button
          type="button"
          onClick={() =>
            setVisible(false)
          }
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background hover:bg-secondary"
          aria-label="Hide maintenance schedule"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="pr-8">

          <div className="flex items-center gap-2">

            {status === 'upcoming' ? (
              <Clock3 className="h-4 w-4 text-accent" />
            ) : (
              <CalendarClock className="h-4 w-4 text-accent" />
            )}

            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              {status === 'upcoming'
                ? 'Scheduled Maintenance'
                : 'Maintenance In Progress'}
            </span>

          </div>

          <div className="mt-2 text-sm font-semibold">
            {isGlobal
              ? 'Auronix Commerce website maintenance'
              : `${pageTitle || 'This page'} maintenance`}
          </div>

          {status === 'upcoming' && (
            <>
              <p className="mt-1 text-xs leading-5 text-foreground-muted">
                Scheduled for{' '}
                <strong className="text-foreground">
                  {formatDate(
                    activeSchedule.startAt
                  )}
                </strong>

                {activeSchedule.endAt && (
                  <>
                    {' '}
                    until{' '}
                    <strong className="text-foreground">
                      {formatDate(
                        activeSchedule.endAt
                      )}
                    </strong>
                  </>
                )}
                .
              </p>

              <div className="mt-3 rounded-xl bg-secondary/60 p-3">

                <div className="text-xs text-foreground-muted">
                  {introVisible
                    ? 'Maintenance begins in'
                    : 'Maintenance starts soon'}
                </div>

                <div className="mt-1 font-mono text-xl font-semibold tracking-tight">
                  {formatRemaining(
                    startRemaining || 0
                  )}
                </div>

              </div>
            </>
          )}

          {status === 'active' && (
            <>
              <p className="mt-1 text-xs leading-5 text-foreground-muted">
                Maintenance is currently in progress.

                {activeSchedule.endAt && (
                  <>
                    {' '}
                    Expected to finish at{' '}
                    <strong className="text-foreground">
                      {formatDate(
                        activeSchedule.endAt
                      )}
                    </strong>
                    .
                  </>
                )}
              </p>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 p-3">

                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <CheckCircle2 className="h-4 w-4 text-accent" />

                  Expected completion
                </div>

                {endRemaining !== null ? (
                  <div className="font-mono text-sm font-semibold">
                    {formatRemaining(
                      endRemaining
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-semibold">
                    Time not specified
                  </div>
                )}

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default MaintenanceScheduleBanner;
