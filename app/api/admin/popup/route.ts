import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(
  request: Request
) {
  try {
    await requireAdmin(request);

    const snapshot =
      await adminDb
        .ref('sitePopup')
        .get();

    return NextResponse.json(
      snapshot.exists()
        ? snapshot.val()
        : {
            enabled: false,
            eyebrow: 'AURONIX',
            title: 'What’s new',
            message:
              'See the latest updates and improvements across Auronix Commerce.',
            buttonText: 'See What’s New',
            buttonHref: '/whats-new',
            secondaryText: 'Close',
            secondaryHref: '',
            showOncePerSession: true,
            delay: 700,
          }
    );
  } catch (error) {
    console.error(
      'Admin popup GET failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to load popup settings.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const admin =
      await requireAdmin(request);

    const body =
      await request.json();

    const data = {
      enabled:
        body.enabled === true,

      eyebrow:
        typeof body.eyebrow === 'string'
          ? body.eyebrow.slice(0, 80)
          : 'AURONIX',

      title:
        typeof body.title === 'string'
          ? body.title.slice(0, 160)
          : '',

      message:
        typeof body.message === 'string'
          ? body.message.slice(0, 3000)
          : '',

      buttonText:
        typeof body.buttonText === 'string'
          ? body.buttonText.slice(0, 80)
          : '',

      buttonHref:
        typeof body.buttonHref === 'string'
          ? body.buttonHref.slice(0, 500)
          : '',

      secondaryText:
        typeof body.secondaryText === 'string'
          ? body.secondaryText.slice(0, 80)
          : 'Close',

      secondaryHref:
        typeof body.secondaryHref === 'string'
          ? body.secondaryHref.slice(0, 500)
          : '',

      showOncePerSession:
        body.showOncePerSession !== false,

      delay: Math.max(
        0,
        Math.min(
          10000,
          Number(body.delay || 700)
        )
      ),

      updatedAt:
        Date.now(),

      updatedBy:
        admin.uid,
    };

    await adminDb
      .ref('sitePopup')
      .set(data);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error(
      'Admin popup POST failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to save popup.',
      },
      {
        status: 500,
      }
    );
  }
}
