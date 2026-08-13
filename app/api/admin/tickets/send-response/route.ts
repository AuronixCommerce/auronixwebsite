import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { sendTicketResponseEmail } from '@/lib/server-mail';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const ticketId = String(body.ticketId || '');
    const response = String(body.response || '').trim();

    if (!ticketId || !response) {
      return NextResponse.json(
        { error: 'Ticket ID and response are required.' },
        { status: 400 }
      );
    }

    const snapshot =
      await adminDb.ref(`tickets/${ticketId}`).get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const ticket = snapshot.val();

    if (!ticket.email) {
      return NextResponse.json(
        { error: 'Ticket has no email address.' },
        { status: 400 }
      );
    }

    await sendTicketResponseEmail(
      ticket.email,
      ticket.subject || 'Auronix Support',
      response
    );

    await adminDb.ref(`tickets/${ticketId}`).update({
      lastResponse: response,
      respondedAt: Date.now(),
      updatedAt: Date.now(),
      status: 'resolved',
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Ticket response failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send response.',
      },
      { status: 500 }
    );
  }
}
