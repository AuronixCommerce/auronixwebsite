'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowRight,
  Wrench,
  X,
} from 'lucide-react';

import {
  MaintenanceScheduleBanner,
} from './maintenance-schedule-banner';

type Schedule = {
  enabled: boolean;

  startAt:
    | number
    | null;

  endAt:
    | number
    | null;

  upcoming: boolean;

  active: boolean;
};

type Control = {
  maintenanceEnabled?: boolean;

  maintenanceTitle?: string;

  maintenanceMessage?: string;

  schedule?: Schedule;

  popupEnabled?: boolean;

  popupTitle?: string;

  popupMessage?: string;

  popupButtonText?: string;

  popupButtonUrl?: string;

  popupFrequency?:
    | 'once'
    | 'session'
    | 'always';

  popupUntilAt?:
    | number
    | null;
};

type ScheduledPage = {
  path: string;
  title: string;
  startAt: number;
  endAt: number | null;
};

type GlobalControl = {
  maintenanceEnabled?: boolean;

  maintenanceTitle?: string;

  maintenanceMessage?: string;

  schedule?: Schedule;
};

export function PageControlOverlay({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    page,
    setPage,
  ] =
    useState<Control>(
      {}
    );

  const [
    global,
    setGlobal,
  ] =
    useState<GlobalControl>(
      {}
    );

  const [
    scheduledPages,
    setScheduledPages,
  ] = useState<ScheduledPage[]>([]);

  const [
    popupOpen,
    setPopupOpen,
  ] =
    useState(
      false
    );

  const [
    maintenanceOpen,
    setMaintenanceOpen,
  ] =
    useState(
      true
    );

  const [
    path,
    setPath,
  ] =
    useState(
      '/'
    );

  useEffect(() => {
    const currentPath =
      window.location.pathname;

    setPath(
      currentPath
    );

    const privateArea =
      currentPath.startsWith(
        '/admin'
      ) ||
      currentPath.startsWith(
        '/api'
      ) ||
      currentPath.startsWith(
        '/auth'
      );

    if (
      privateArea
    ) {
      setLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            `/api/page-controls?path=${encodeURIComponent(
              currentPath
            )}`,
            {
              cache:
                'no-store',
              headers: {
                'Cache-Control':
                  'no-cache',
              },
            }
          );

        const data =
          await response.json();

        if (
          cancelled
        ) {
          return;
        }

        setGlobal(
          data.global ||
            {}
        );

        setPage(
          data.page ||
            {}
        );

        setScheduledPages(
          Array.isArray(data.scheduledPages)
            ? data.scheduledPages
            : []
        );

        const popup =
          data.page
            ?.popupEnabled ===
          true;

        const popupUntil =
          data.page
            ?.popupUntilAt;

        const stillActive =
          !popupUntil ||
          Date.now() <
            Number(
              popupUntil
            );

        if (
          popup &&
          stillActive &&
          !data.global
            ?.maintenanceEnabled &&
          !data.page
            ?.maintenanceEnabled
        ) {
          const frequency =
            data.page
              ?.popupFrequency ||
            'session';

          let show =
            true;

          if (
            frequency ===
            'once'
          ) {
            const key =
              `auronix-popup-once:${currentPath}:${data.page?.updatedAt || 0}`;

            show =
              !localStorage.getItem(
                key
              );

            if (
              show
            ) {
              localStorage.setItem(
                key,
                '1'
              );
            }
          }

          if (
            frequency ===
            'session'
          ) {
            const key =
              `auronix-popup-session:${currentPath}:${data.page?.updatedAt || 0}`;

            show =
              !sessionStorage.getItem(
                key
              );

            if (
              show
            ) {
              sessionStorage.setItem(
                key,
                '1'
              );
            }
          }

          setPopupOpen(
            show
          );
        }
      } catch (
        error
      ) {
        console.error(
          'Page control load failed:',
          error
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
    };
  }, []);

  if (
    loading
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  const globalSchedule =
    global.schedule;

  const pageSchedule =
    page.schedule;

  const fullSiteScheduled =
    globalSchedule?.enabled ===
      true &&
    (
      globalSchedule.upcoming ||
      globalSchedule.active
    );

  const dedicatedScheduled =
    !fullSiteScheduled &&
    pageSchedule?.enabled ===
      true &&
    (
      pageSchedule.upcoming ||
      pageSchedule.active
    );

  const globalMaintenance =
    Boolean(
      global.maintenanceEnabled
    );

  const pageMaintenance =
    Boolean(
      page.maintenanceEnabled
    );

  const maintenance =
    globalMaintenance ||
    pageMaintenance ||
    globalSchedule?.active ===
      true ||
    pageSchedule?.active ===
      true;

  const title =
    pageMaintenance
      ? page.maintenanceTitle
      : globalMaintenance
      ? global.maintenanceTitle
      : pageSchedule?.active
      ? page.maintenanceTitle
      : globalSchedule?.active
      ? global.maintenanceTitle
      : 'Scheduled maintenance';

  const message =
    pageMaintenance
      ? page.maintenanceMessage
      : globalMaintenance
      ? global.maintenanceMessage
      : pageSchedule?.active
      ? page.maintenanceMessage
      : globalSchedule?.active
      ? global.maintenanceMessage
      : 'Scheduled maintenance is currently in progress.';

  const homeDedicatedSchedule =
    path === '/' &&
    !fullSiteScheduled &&
    !dedicatedScheduled &&
    scheduledPages.length > 0
      ? {
          enabled: true,
          startAt: scheduledPages[0].startAt,
          endAt: scheduledPages[0].endAt,
          upcoming: true,
          active: false,
        }
      : null;

  const scheduleToShow =
    fullSiteScheduled
      ? globalSchedule
      : dedicatedScheduled
      ? pageSchedule
      : homeDedicatedSchedule;

  return (
    <div className="relative min-h-screen">

      <div
        className={
          maintenance
            ? 'pointer-events-none select-none blur-[7px] transition-all duration-300'
            : ''
        }
      >
        {children}
      </div>

      {/* SCHEDULE NOTICE */}
      {scheduleToShow && (
        <MaintenanceScheduleBanner
          schedule={
            scheduleToShow
          }
          scope={
            fullSiteScheduled
              ? 'global'
              : 'page'
          }
          pageTitle={
            fullSiteScheduled
              ? undefined
              : dedicatedScheduled
              ? page.maintenanceTitle
              : scheduledPages[0]?.title
          }
        />
      )}

      {/* ACTIVE MAINTENANCE */}
      {maintenance && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-5 py-8 backdrop-blur-[3px]">

          <button
            type="button"
            onClick={() =>
              setMaintenanceOpen(
                false
              )
            }
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md hover:bg-black/75"
            aria-label="Close maintenance message"
          >
            <X className="h-5 w-5" />
          </button>

          {maintenanceOpen ? (
            <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-background/95 p-8 shadow-2xl backdrop-blur-2xl sm:p-12">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Wrench className="h-8 w-8 text-accent" />
              </div>

              <div className="mt-7 text-center">

                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                  {globalSchedule?.active ||
                  pageSchedule?.active
                    ? 'SCHEDULED MAINTENANCE'
                    : 'TEMPORARILY UNAVAILABLE'}
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {title}
                </h1>

                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-foreground-muted sm:text-base">
                  {message}
                </p>

              </div>

              <div className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />

                  <div>

                    <h2 className="font-semibold">
                      {(
                        globalSchedule?.endAt ||
                        pageSchedule?.endAt
                      ) ? (
                        <>
                          Expected to finish at{' '}
                          {new Intl.DateTimeFormat(
                            undefined,
                            {
                              dateStyle:
                                'medium',
                              timeStyle:
                                'short',
                            }
                          ).format(
                            new Date(
                              globalSchedule?.endAt ||
                                pageSchedule?.endAt ||
                                0
                            )
                          )}
                          .
                        </>
                      ) : (
                        'Please check back shortly.'
                      )}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-foreground-muted">
                      We appreciate your patience while we complete
                      the scheduled maintenance.
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-7 flex justify-center">

                {!globalSchedule?.active &&
                  !globalMaintenance &&
                  !globalSchedule?.upcoming && (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Back to Auronix
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

              </div>

            </div>
          ) : (
            <div className="fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/75 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl">
              Page under maintenance.

              <button
                type="button"
                onClick={() =>
                  setMaintenanceOpen(
                    true
                  )
                }
                className="font-semibold text-accent hover:underline"
              >
                View
              </button>
            </div>
          )}

        </div>
      )}

      {/* PAGE POPUP */}
      {!maintenance &&
        popupOpen &&
        page.popupEnabled && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">

            <div className="ac-content-panel relative w-full max-w-lg p-7 shadow-2xl sm:p-9">

              <button
                type="button"
                onClick={() =>
                  setPopupOpen(
                    false
                  )
                }
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-secondary"
                aria-label="Close popup"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pr-8">

                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  IMPORTANT UPDATE
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {page.popupTitle ||
                    'Important update'}
                </h2>

                <p className="mt-4 text-sm leading-7 text-foreground-muted">
                  {page.popupMessage}
                </p>

                {page.popupButtonUrl && (
                  <Link
                    href={
                      page.popupButtonUrl
                    }
                    onClick={() =>
                      setPopupOpen(
                        false
                      )
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    {page.popupButtonText ||
                      'Learn More'}

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

              </div>

            </div>

          </div>
        )}

      {/* Used by other public components if they need current route. */}
      <span className="sr-only">
        {path}
      </span>

    </div>
  );
}
