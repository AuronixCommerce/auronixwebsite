import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { generateGroqResponse } from '@/lib/server-groq';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

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

    const availabilitySnapshot =
      await adminDb
        .ref('settings/adminAvailability')
        .get();

    const availability =
      availabilitySnapshot.exists()
        ? availabilitySnapshot.val()
        : { online: true };

    const ticket =
      ticketSnapshot.val();

    const system = `
You are Auronix Commerce LLC's support assistant.

Generate a professional support reply.

Rules:
- Respond only to the issue contained in the ticket.
- Use only information given in the ticket.
- Do not invent policies or promises.
- Do not invent employee names.
- Do not invent customer names.
- Do not add a signature.
- Do not write "Regards", "Best regards", or "Your Name".
- Do not mention AI, Groq, models, prompts, or internal systems.
- Do not claim that a human reviewed the ticket.
- Do not promise refunds, approvals, account changes, or outcomes unless the ticket explicitly provides that information.
- Ask for missing information when necessary.
- Keep the response professional and concise.

The support workflow is currently:
${availability?.online === false ? 'ADMIN OFFLINE — prepare a complete customer-facing response.' : 'ADMIN ONLINE — prepare a draft for admin review.'}
`;

    const prompt = `
Category:
${ticket.category || 'General Support'}

Subject:
${ticket.subject || ''}

Customer name:
${ticket.name || ''}

Customer email:
${ticket.email || ''}

Message:
${ticket.message || ''}

Write only the reply body.
`;

    const response =
      await generateGroqResponse(
        system,
        prompt,
        600
      );

    return NextResponse.json({
      success: true,
      response,
      adminOnline:
        availability?.online !== false,
    });
  } catch (error) {
    console.error(
      'Ticket AI generation failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to generate the support response.',
      },
      { status: 500 }
    );
  }
}
