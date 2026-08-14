import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateGroqResponse } from '@/lib/server-groq';
import { sendTicketResponseEmail } from '@/lib/server-mail';

export async function POST(request: Request) {
  try {
    const availabilitySnapshot =
      await adminDb
        .ref('settings/adminAvailability')
        .get();

    const availability =
      availabilitySnapshot.exists()
        ? availabilitySnapshot.val()
        : { online: true };

    // Automatic responses only happen when the admin is offline.
    if (availability?.online !== false) {
      return NextResponse.json({
        automated: false,
        message:
          'Admin is online. Manual support is active.',
      });
    }

    const body = await request.json();

    const ticketId = String(
      body.ticketId || ''
    ).trim();

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required.' },
        { status: 400 }
      );
    }

    const ticketSnapshot =
      await adminDb
        .ref(`tickets/${ticketId}`)
        .get();

    if (!ticketSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const ticket =
      ticketSnapshot.val();

    if (!ticket.email) {
      return NextResponse.json(
        {
          error:
            'Ticket does not contain a customer email address.',
        },
        { status: 400 }
      );
    }

    const system = `
You are the automated support representative for Auronix Commerce LLC.

The administrative team is currently offline.

Write a professional customer-support response.

Rules:
- Acknowledge the request.
- Address the issue using only the ticket information.
- Do not pretend a human reviewed it.
- Do not invent policies.
- Do not invent names.
- Do not add a signature.
- Do not use "Regards", "Best regards", or "Your Name".
- Do not promise approval, refunds, payments, account changes, or final decisions.
- Explain that the support request has been received and a member of the team can follow up when appropriate.
- Keep it concise.
`;

    const prompt = `
Ticket category:
${ticket.category || 'General Support'}

Subject:
${ticket.subject || ''}

Customer message:
${ticket.message || ''}

Write only the email reply body.
`;

    const response =
      await generateGroqResponse(
        system,
        prompt,
        450
      );

    await sendTicketResponseEmail(
      ticket.email,
      ticket.subject || 'Auronix Support',
      response
    );

    await adminDb
      .ref(`tickets/${ticketId}`)
      .update({
        status: 'in-progress',
        lastResponse: response,
        respondedAt: Date.now(),
        updatedAt: Date.now(),
        automatedResponse: true,
      });

    return NextResponse.json({
      success: true,
      automated: true,
    });
  } catch (error) {
    console.error(
      'Automatic ticket response failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send automatic support response.',
      },
      { status: 500 }
    );
  }
}
