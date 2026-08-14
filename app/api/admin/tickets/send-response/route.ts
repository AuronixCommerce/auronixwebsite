import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { sendTicketResponseEmail } from '@/lib/server-mail';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const ticketId = text(body.ticketId);
    const response = text(body.response);

    if (!ticketId || !response) {
      return NextResponse.json(
        {
          error:
            'Ticket ID and response are required.',
        },
        { status: 400 }
      );
    }

    const ticketRef =
      adminDb.ref(`tickets/${ticketId}`);

    const snapshot = await ticketRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const ticket = snapshot.val();

    if (!text(ticket.email)) {
      return NextResponse.json(
        {
          error:
            'This ticket does not contain a customer email.',
        },
        { status: 400 }
      );
    }

    const messageRef =
      ticketRef.child('messages').push();

    await messageRef.set({
      role: 'admin',
      content: response,
      createdAt: Date.now(),
      createdBy: admin.uid,
    });

    await ticketRef.update({
      lastResponse: response,
      respondedAt: Date.now(),
      updatedAt: Date.now(),
      status:
        ticket.status === 'closed'
          ? 'open'
          : 'in-progress',
    });

    await sendTicketResponseEmail(
      ticket.email,
      ticket.subject || 'Auronix Support',
      response
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'Ticket response send failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send support response.',
      },
      { status: 500 }
    );
  }
}
