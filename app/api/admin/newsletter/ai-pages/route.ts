import { userFacingError } from '@/lib/user-facing-error';
import {
  NextResponse,
} from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  requireAdmin,
} from '@/lib/server-auth';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

function text(
  value: unknown
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function num(
  value: unknown
) {
  const result =
    Number(value);

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}

export async function GET(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const snapshot =
      await adminDb
        .ref(
          'aiGeneratedNewsletterPages'
        )
        .get();

    const raw =
      snapshot.exists()
        ? snapshot.val()
        : {};

    const now =
      Date.now();

    const pages =
      raw &&
      typeof raw ===
        'object'
        ? Object.entries(
            raw as Record<
              string,
              any
            >
          )
            .map(
              ([token, value]) => {
                const record =
                  value &&
                  typeof value ===
                    'object'
                    ? value
                    : {};

                const expiresAt =
                  num(
                    record.expiresAt
                  );

                let status:
                  | 'active'
                  | 'expired'
                  | 'disabled' =
                  'expired';

                if (
                  record.active ===
                    true &&
                  (
                    expiresAt <=
                      0 ||
                    expiresAt >
                      now
                  )
                ) {
                  status =
                    'active';
                }

                if (
                  record.disabledAt
                ) {
                  status =
                    'disabled';
                }

                return {
                  token:
                    text(
                      record.token ||
                      token
                    ),

                  url:
                    text(
                      record.url
                    ) ||
                    'https://auronixcommerce.com/go/' +
                      text(
                        record.token ||
                        token
                      ),

                  campaignId:
                    text(
                      record.campaignId
                    ) ||
                    null,

                  campaignName:
                    text(
                      record.campaignName
                    ),

                  pageType:
                    text(
                      record.pageType
                    ) ||
                    'general',

                  title:
                    text(
                      record.title
                    ),

                  destinationPath:
                    text(
                      record.destinationPath
                    ) ||
                    '/',

                  formEnabled:
                    record.formEnabled ===
                    true,

                  createdAt:
                    num(
                      record.createdAt
                    ),

                  expiresAt,

                  active:
                    status ===
                    'active',

                  status,

                  viewCount:
                    num(
                      record.viewCount
                    ),

                  reservationCount:
                    num(
                      record.reservationCount
                    ),

                  lastViewedAt:
                    num(
                      record.lastViewedAt
                    ) ||
                    null,

                  source:
                    text(
                      record.source
                    ) ||
                    'ai-newsletter',

                  activity:
                    record.activity &&
                    typeof record.activity ===
                      'object'
                      ? record.activity
                      : {},
                };
              }
            )
            .sort(
              (a, b) =>
                b.createdAt -
                a.createdAt
            )
        : [];

    const summary = {
      total:
        pages.length,

      active:
        pages.filter(
          page =>
            page.status ===
            'active'
        ).length,

      expired:
        pages.filter(
          page =>
            page.status ===
            'expired'
        ).length,

      disabled:
        pages.filter(
          page =>
            page.status ===
            'disabled'
        ).length,

      views:
        pages.reduce(
          (
            total,
            page
          ) =>
            total +
            page.viewCount,
          0
        ),

      reservations:
        pages.reduce(
          (
            total,
            page
          ) =>
            total +
            page.reservationCount,
          0
        ),
    };

    return NextResponse.json(
      {
        success:
          true,

        pages,

        summary,

        generatedAt:
          now,
      },
      {
        status:
          200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      '[AI Generated Pages]',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to load AI generated pages.',
      },
      {
        status:
          500,
      }
    );
  }
}