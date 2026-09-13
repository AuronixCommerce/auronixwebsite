import {
  headers,
} from 'next/headers';

import {
  getMaintenanceContext,
} from '@/lib/server-maintenance-context';

type MaintenanceGateProps = {
  children: React.ReactNode;
};

function strictFlag(
  value: unknown
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'TRUE' ||
    value === 'True'
  );
}

function getPathname(): string {
  const requestHeaders = headers();

  const pathname =
    requestHeaders.get('x-auronix-pathname') || requestHeaders.get(
      'x-pathname'
    ) ||
    requestHeaders.get(
      'x-invoke-path'
    ) ||
    requestHeaders.get(
      'x-nextjs-pathname'
    ) ||
    '/';

  return pathname.startsWith('/')
    ? pathname
    : `/${pathname}`;
}

function formatDate(
  value: unknown
): string | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  try {
    return new Date(
      value
    ).toLocaleString(
      'en-US',
      {
        dateStyle:
          'medium',
        timeStyle:
          'short',
      }
    );
  } catch {
    return null;
  }
}

export async function ServerMaintenanceGate({
  children,
}: MaintenanceGateProps) {
  const pathname =
    getPathname();

  /*
   * Never block administrative pages.
   */
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  ) {
    return <>{children}</>;
  }

  let context:
    | Awaited<
        ReturnType<
          typeof getMaintenanceContext
        >
      >
    | null = null;

  try {
    context =
      await getMaintenanceContext(
        pathname
      );
  } catch (
    error
  ) {
    console.error(
      '[Maintenance Gate] Failed to load maintenance context:',
      error
    );

    /*
     * Fail open rather than taking the entire
     * public website down because the maintenance
     * service itself had an error.
     */
    return <>{children}</>;
  }

  const global =
    context?.global;

  const page =
    context?.page;

  const globalActive =
    strictFlag(
      global?.active
    );

  const pageActive =
    strictFlag(
      page?.active
    );

  /*
   * ==========================================================
   * FULL WEBSITE MAINTENANCE
   * ==========================================================
   *
   * The actual page is NOT rendered.
   * Therefore removing an overlay in DevTools
   * cannot reveal the page.
   */
  if (
    globalActive
  ) {
    const endText =
      formatDate(
        global?.endAt
      );

    return (
      <MaintenanceScreen
        scope="global"
        title="Website Maintenance"
        message="Auronix Commerce is currently undergoing website maintenance. Please check back shortly."
        endText={endText}
      />
    );
  }

  /*
   * ==========================================================
   * DEDICATED PAGE MAINTENANCE
   * ==========================================================
   */
  if (
    pageActive
  ) {
    const endText =
      formatDate(
        page?.endAt
      );

    return (
      <MaintenanceScreen
        scope="page"
        title="Page Temporarily Unavailable"
        message={`The page ${pathname} is currently undergoing maintenance. Other areas of Auronix Commerce may remain available.`}
        endText={endText}
      />
    );
  }

  /*
   * No active maintenance:
   * render the real page.
   */
  return <>{children}</>;
}

function MaintenanceScreen({
  scope,
  title,
  message,
  endText,
}: {
  scope:
    | 'global'
    | 'page';

  title: string;

  message: string;

  endText:
    | string
    | null;
}) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-5 py-16 font-sans text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_35%)]" />

      <section className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-border bg-card/90 p-7 shadow-[0_30px_100px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="pointer-events-none absolute bottom-[-100px] left-[-80px] h-56 w-56 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M12 3v9"
                  strokeLinecap="round"
                />

                <path
                  d="M12 16.5v.01"
                  strokeLinecap="round"
                />

                <path
                  d="M10.3 5.2 3.9 16.3A2 2 0 0 0 5.6 19h12.8a2 2 0 0 0 1.7-2.7L13.7 5.2a2 2 0 0 0-3.4 0Z"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted">
                Auronix Commerce LLC
              </div>

              <div className="mt-1 font-sans text-sm font-semibold">
                {scope ===
                'global'
                  ? 'Website Maintenance'
                  : 'Page Maintenance'}
              </div>
            </div>
          </div>

          <h1 className="font-sans text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl">
            {title}
          </h1>

          <p className="mt-4 font-sans text-sm leading-7 text-foreground-muted sm:text-base">
            {message}
          </p>

          {endText ? (
            <div className="mt-7 rounded-2xl border border-border bg-secondary/40 px-4 py-4">
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-foreground-muted">
                Expected completion
              </div>

              <div className="mt-1 font-sans text-sm font-semibold sm:text-base">
                {endText}
              </div>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-border bg-secondary/40 px-4 py-4 font-sans text-sm leading-6 text-foreground-muted">
              No exact completion time has been provided.
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5">
            <div className="font-sans text-xs leading-5 text-foreground-muted">
              Please check back later.
            </div>

            <div className="shrink-0 rounded-full border border-border bg-background/60 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
              {scope ===
              'global'
                ? 'All services'
                : 'This page'}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ServerMaintenanceGate;
