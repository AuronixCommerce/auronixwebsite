import { userFacingError } from '@/lib/user-facing-error';
import {
  NextResponse,
} from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

function text(
  value: unknown,
  max = 3000
): string {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

function validEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function safeNumber(
  value: unknown
): number {
  const result =
    Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

export async function POST(
  request: Request,
  context: {
    params: {
      token: string;
    };
  }
) {
  try {
    const token =
      text(
        context.params?.token,
        100
      ).toUpperCase();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Campaign token is required.',
        },
        {
          status: 400,
        }
      );
    }

    const campaignRef =
      adminDb.ref(
        'newsletterLinks/' +
        token
      );

    const snapshot =
      await campaignRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Campaign page not found.',
        },
        {
          status: 404,
        }
      );
    }

    const campaign =
      snapshot.val();

    if (
      !campaign ||
      campaign.active !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This campaign is no longer accepting submissions.',
        },
        {
          status: 410,
        }
      );
    }

    const expiresAt =
      safeNumber(
        campaign.expiresAt
      );

    if (
      expiresAt <= 0 ||
      Date.now() >= expiresAt
    ) {
      await campaignRef.update({
        active: false,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            'This campaign has expired.',
        },
        {
          status: 410,
        }
      );
    }

    const pageData =
      campaign.pageData &&
      typeof campaign.pageData ===
        'object'
        ? campaign.pageData
        : {};

    if (
      pageData.formEnabled !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This campaign does not currently accept form submissions.',
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const name =
      text(
        body?.name,
        200
      );

    const email =
      text(
        body?.email,
        320
      ).toLowerCase();

    const company =
      text(
        body?.company,
        250
      );

    const phone =
      text(
        body?.phone,
        100
      );

    const attendeesValue =
      safeNumber(
        body?.attendees
      );

    const attendees =
      attendeesValue > 0
        ? Math.min(
            attendeesValue,
            1000
          )
        : null;

    const message =
      text(
        body?.message,
        3000
      );

    const notes =
      text(
        body?.notes,
        3000
      );

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Full name is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email ||
      !validEmail(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A valid email address is required.',
        },
        {
          status: 400,
        }
      );
    }

    const reservationRef =
      campaignRef
        .child(
          'reservations'
        )
        .push();

    const reservationId =
      reservationRef.key ||
      'submission-' +
        Date.now();

    const createdAt =
      Date.now();

    await reservationRef.set({
      id:
        reservationId,

      name,

      email,

      company,

      phone,

      attendees,

      message,

      notes,

      createdAt,

      status:
        'new',
    });

    const activityRef =
      campaignRef
        .child(
          'activity'
        )
        .push();

    await activityRef.set({
      type:
        'form-submission',

      createdAt,

      metadata: {
        submissionId:
          reservationId,

        name,

        email,

        company,

        formType:
          pageData.formType ||
          'general',
      },
    });

    const currentCount =
      safeNumber(
        campaign.reservationCount
      );

    await campaignRef.update({
      reservationCount:
        currentCount + 1,

      lastReservationAt:
        createdAt,
    });

    await adminDb
      .ref(
        `aiGeneratedNewsletterPages/${token}`
      )
      .update({
        reservationCount:
          currentCount + 1,

        lastReservationAt:
          createdAt,
      });

    await adminDb
      .ref(
        `aiGeneratedNewsletterPages/${token}/activity`
      )
      .push()
      .set({
        type:
          'reservation-submitted',

        createdAt,

        submissionId:
          reservationId,

        name,

        email,

        company,
      });

    return NextResponse.json(
      {
        success: true,

        submissionId:
          reservationId,

        campaignToken:
          token,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '[Campaign Form Submission]',
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to submit the form.',
      },
      {
        status: 500,
      }
    );
  }
}