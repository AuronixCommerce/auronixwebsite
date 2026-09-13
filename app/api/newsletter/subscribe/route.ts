import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import {
  isValidNewsletterEmail,
  subscribeToNewsletter,
} from '@/lib/server-newsletter';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export async function POST(
  request: Request
) {
  try {
    const contentType =
      request.headers.get(
        'content-type'
      ) || '';

    if (
      !contentType.includes(
        'application/json'
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Request must use application/json.',
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    await protectPublicRequest(request, 'newsletter-subscribe', body, { limit: 5, windowMs: 15 * 60_000 });

    const email =
      typeof body?.email ===
      'string'
        ? body.email.trim()
        : '';

    const name =
      typeof body?.name ===
      'string'
        ? body.name.trim()
        : '';

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email address is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidNewsletterEmail(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Please enter a valid email address.',
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await subscribeToNewsletter(
        email,
        name,
        'footer'
      );

    return NextResponse.json(
      {
        success: true,

        alreadySubscribed:
          Boolean(
            result.alreadySubscribed
          ),

        confirmationRequired: Boolean(result.confirmationRequired),
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    );
  } catch (
    error
  ) {
    const protectedError = publicRequestErrorResponse(error);
    if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status, headers: protectedError.body.retryAfter ? { 'Retry-After': String(protectedError.body.retryAfter) } : undefined });
    console.error(
      'Newsletter subscription API error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to subscribe to the newsletter.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    );
  }
}
