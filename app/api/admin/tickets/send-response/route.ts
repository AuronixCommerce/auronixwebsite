import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { sendTicketResponseEmail } from '@/lib/server-mail';

function text(
  value: unknown
) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

export async function POST(
  request: Request
) {
  try {
    const admin =
      await requireAdmin(
        request
      );

    const body =
      await request.json();

    const ticketId =
      text(
        body?.ticketId
      );

    const response =
      text(
        body?.response
      );

    const aiGenerated =
      body?.aiGenerated ===
      true;

    if (
      !ticketId ||
      !response
    ) {
      return NextResponse.json(
        {
          error:
            'Ticket ID and response are required.',
        },
        {
          status: 400,
        }
      );
    }

    const ticketRef =
      adminDb.ref(
        `tickets/${ticketId}`
      );

    const snapshot =
      await ticketRef.get();

    if (
      !snapshot.exists()
    ) {
      return NextResponse.json(
        {
          error:
            'Ticket not found.',
        },
        {
          status: 404,
        }
      );
    }

    const ticket =
      snapshot.val();

    const customerEmail =
      text(
        ticket?.email
      );

    if (!customerEmail) {
      return NextResponse.json(
        {
          error:
            'This ticket does not contain a customer email.',
        },
        {
          status: 400,
        }
      );
    }

    const messageRef =
      ticketRef
        .child('messages')
        .push();

    await messageRef.set({
      role:
        aiGenerated
          ? 'ai'
          : 'admin',

      content:
        response,

      createdAt:
        Date.now(),

      createdBy:
        admin.uid,

      aiGenerated:
        aiGenerated,
    });

    await ticketRef.update({
      lastResponse:
        response,

      respondedAt:
        Date.now(),

      updatedAt:
        Date.now(),

      status:
        ticket.status ===
        'closed'
          ? 'open'
          : 'in-progress',
    });

    if (ticket?.sellerUid) {
      const notification = adminDb.ref(`sellerNotifications/${ticket.sellerUid}`).push();
      await notification.set({ id: notification.key, type: 'support', title: 'Support replied to your ticket', message: text(ticket?.subject) || 'Auronix Support sent a new response.', href: '/seller/support', ticketId, createdAt: Date.now() });
    }

    await sendTicketResponseEmail({
      to:
        customerEmail,

      name:
        text(
          ticket?.name
        ),

      subject:
        text(
          ticket?.subject
        ) ||
        'Auronix Commerce Support',

      body:
        response,

      ticketId,

      aiGenerated,

      automated:
        true,
    });

    return NextResponse.json({
      success:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      'Ticket response send failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to send support response.',
      },
      {
        status: 500,
      }
    );
  }
}
