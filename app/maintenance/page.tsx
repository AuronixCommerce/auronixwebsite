import Link from 'next/link';

import {
  getMaintenanceContext,
} from '@/lib/server-maintenance-context';

import {
  AIChat,
} from '@/components/site/ai-chat';

export const metadata = {
  title:
    'Maintenance | Auronix Commerce LLC',

  robots: {
    index: false,
    follow: false,
  },
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

function getTimestamp(
  value: unknown
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function formatDate(
  value: unknown
): string | null {
  const timestamp =
    getTimestamp(value);

  if (
    timestamp === null
  ) {
    return null;
  }

  try {
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
  } catch {
    return null;
  }
}

type NormalizedMaintenance = {
  global: {
    active: boolean;
    upcoming: boolean;
    startAt: number | null;
    endAt: number | null;
  };

  page: {
    path: string;
    active: boolean;
    upcoming: boolean;
    startAt: number | null;
    endAt: number | null;
  };
};

function normalizeContext(
  raw: unknown,
  pathname: string
): NormalizedMaintenance {
  /*
   * The existing maintenance helper is currently
   * typed too loosely for the page component.
   *
   * Normalize only the fields we actually need.
   */
  const source =
    raw &&
    typeof raw === 'object'
      ? raw as Record<
          string,
          unknown
        >
      : {};

  const globalRaw =
    source.global &&
    typeof source.global ===
      'object'
      ? source.global as Record<
          string,
          unknown
        >
      : {};

  const pageRaw =
    source.page &&
    typeof source.page ===
      'object'
      ? source.page as Record<
          string,
          unknown
        >
      : {};

  return {
    global: {
      active:
        strictFlag(
          globalRaw.active
        ),

      upcoming:
        strictFlag(
          globalRaw.upcoming
        ),

      startAt:
        getTimestamp(
          globalRaw.startAt
        ),

      endAt:
        getTimestamp(
          globalRaw.endAt
        ),
    },

    page: {
      path:
        typeof pageRaw.path ===
        'string'
          ? pageRaw.path
          : pathname,

      active:
        strictFlag(
          pageRaw.active
        ),

      upcoming:
        strictFlag(
          pageRaw.upcoming
        ),

      startAt:
        getTimestamp(
          pageRaw.startAt
        ),

      endAt:
        getTimestamp(
          pageRaw.endAt
        ),
    },
  };
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams?: {
    path?: string;
    scope?: string;
  };
}) {
  const pathname =
    searchParams?.path ||
    '/';

  const rawContext =
    await getMaintenanceContext(
      pathname
    ).catch(
      (
        error
      ) => {
        console.error(
          '[Maintenance Page] Failed to load maintenance context:',
          error
        );

        return null;
      }
    );

  const maintenance =
    normalizeContext(
      rawContext,
      pathname
    );

  const globalActive =
    maintenance.global.active;

  const pageActive =
    maintenance.page.active;

  /*
   * Maintenance has ended/been disabled.
   * Return the visitor to the real site.
   */
  if (
    !globalActive &&
    !pageActive
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 font-sans text-foreground">
        <div className="ac-content-panel w-full max-w-lg p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="font-sans text-lg font-extrabold">
              A
            </span>
          </div>

          <h1 className="mt-6 font-sans text-3xl font-extrabold tracking-[-0.05em]">
            We are back.
          </h1>

          <p className="mt-3 font-sans text-sm leading-6 text-foreground-muted">
            The maintenance period has ended.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
          >
            Return to Auronix
          </Link>
        </div>

        <AIChat />
      </main>
    );
  }

  const isGlobal =
    globalActive;

  const title =
    isGlobal
      ? 'Website Maintenance'
      : 'Page Temporarily Unavailable';

  const message =
    isGlobal
      ? 'Auronix Commerce is currently undergoing website maintenance.'
      : `The page ${maintenance.page.path} is currently undergoing maintenance. Other areas of Auronix Commerce may remain available.`;

  const endAt =
    isGlobal
      ? formatDate(
          maintenance.global.endAt
        )
      : formatDate(
          maintenance.page.endAt
        );

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-5 py-16 font-sans text-foreground">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

        <div className="absolute bottom-[-180px] left-[-100px] h-[360px] w-[360px] rounded-full bg-accent/10 blur-[100px]" />

        <div className="absolute right-[-120px] top-1/3 h-[360px] w-[360px] rounded-full bg-white/[0.04] blur-[100px]" />
      </div>

      <section className="relative w-full max-w-xl overflow-hidden rounded-[34px] border border-white/15 bg-card/85 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.25)] backdrop-blur-3xl sm:p-10">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-xl">
              <div className="h-4 w-4 rounded-full bg-white" />
            </div>

            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-foreground-muted">
                Auronix Commerce LLC
              </div>

              <div className="mt-1 font-sans text-sm font-semibold">
                {isGlobal
                  ? 'Full Website Maintenance'
                  : 'Page Maintenance'}
              </div>
            </div>
          </div>

          <div className="mt-9">
            <div className="inline-flex rounded-full border border-border bg-secondary/40 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-foreground-muted">
              {isGlobal
                ? 'Temporarily Offline'
                : 'Temporarily Unavailable'}
            </div>

            <h1 className="mt-5 font-sans text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] sm:text-5xl">
              {title}
            </h1>

            <p className="mt-5 font-sans text-sm leading-7 text-foreground-muted sm:text-base">
              {message}
            </p>

            {endAt ? (
              <div className="mt-7 rounded-2xl border border-border bg-background/50 px-4 py-4">
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-foreground-muted">
                  Expected completion
                </div>

                <div className="mt-1 font-sans text-sm font-bold sm:text-base">
                  {endAt}
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-border bg-background/50 px-4 py-4 font-sans text-sm leading-6 text-foreground-muted">
                No exact completion time has been provided.
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-border bg-background/60 px-5 py-3 font-sans text-sm font-semibold transition hover:bg-secondary"
              >
                Back to Home
              </Link>

              <Link
                href="/contact"
                className="rounded-full bg-primary px-5 py-3 font-sans text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
              >
                Contact Auronix
              </Link>
            </div>
          </div>
        </div>
      </section>

      <AIChat />
    </main>
  );
}
