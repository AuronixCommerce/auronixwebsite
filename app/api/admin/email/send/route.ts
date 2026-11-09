import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/server-auth';

import {
  sendProfessionalEmail,
  type EmailType,
} from '@/lib/server-mail';

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

const ALLOWED_TYPES: EmailType[] = [
  'contact',
  'supplier',
  'seller',
  'support',
  'password-reset',
  'application',
  'general',
];

export async function POST(
  request: Request
) {
  try {
    await requireAdmin(request);

    const body =
      await request.json();

    const to =
      text(body.to);

    const name =
      text(body.name);

    const subject =
      text(body.subject);

    const emailBody =
      text(body.body);

    const requestedType =
      text(body.category) ||
      text(body.type) ||
      'general';

    const type: EmailType =
      ALLOWED_TYPES.includes(
        requestedType as EmailType
      )
        ? (requestedType as EmailType)
        : 'general';

    const threadId =
      text(body.threadId);

    const relatedRecordId =
      text(
        body.relatedRecordId
      );

    const relatedRecordType =
      text(
        body.relatedRecordType
      );

    const inReplyTo =
      text(
        body.inReplyTo
      );

    const references =
      Array.isArray(
        body.references
      )
        ? body.references.filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
                'string' &&
              value.trim()
                .length > 0
          )
        : undefined;

    if (!z.string().email().max(254).safeParse(to).success || /[\r\n]/.test(subject) || subject.length > 200 || emailBody.length > 100000) {
      return NextResponse.json({error:"Enter a valid recipient, subject (up to 200 characters), and message (up to 100,000 characters)."},{status:400});
    }

    if (!to) {
      return NextResponse.json(
        {
          error:
            'Recipient email is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          error:
            'Subject is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!emailBody) {
      return NextResponse.json(
        {
          error:
            'Email body is required.',
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await sendProfessionalEmail({
        to,

        name,

        subject,

        body:
          emailBody,

        type,

        threadId:
          threadId ||
          undefined,

        inReplyTo:
          inReplyTo ||
          undefined,

        references,

        relatedRecordId:
          relatedRecordId ||
          undefined,

        relatedRecordType:
          relatedRecordType ||
          type,

        aiGenerated:
          body.aiGenerated ===
          true,

        automated:
          body.automated ===
          true,
      });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error(
      'Admin email send failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to send email.',
      },
      {
        status: 500,
      }
    );
  }
}
