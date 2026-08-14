import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { generateGroqResponse } from '@/lib/server-groq';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const uid = text(body.uid).trim();

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required.' },
        { status: 400 }
      );
    }

    const [
      userSnapshot,
      ticketsSnapshot,
    ] = await Promise.all([
      adminDb.ref(`users/${uid}`).get(),
      adminDb
        .ref('tickets')
        .get(),
    ]);

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    const user = userSnapshot.val();

    const relatedTickets: any[] = [];

    if (ticketsSnapshot.exists()) {
      const tickets = ticketsSnapshot.val();

      for (const [ticketId, ticket] of Object.entries(tickets)) {
        const item = ticket as any;

        if (
          text(item.uid) === uid ||
          text(item.email).toLowerCase() ===
            text(user.email).toLowerCase()
        ) {
          relatedTickets.push({
            id: ticketId,
            subject: item.subject,
            status: item.status,
            message: item.message,
            lastResponse: item.lastResponse,
          });
        }
      }
    }

    const prompt = `
User:
${JSON.stringify(user, null, 2)}

Related support tickets:
${JSON.stringify(
  relatedTickets.slice(-20),
  null,
  2
)}

Classify this account.

Return JSON with:
{
  "risk": "normal" | "warning" | "suspicious" | "abusive" | "spam" | "high_risk",
  "reason": "brief explanation",
  "recommendedAction": "none" | "warn" | "temporary_restriction" | "admin_review",
  "confidence": number between 0 and 1
}

Do not recommend permanent deletion.
Do not make a final ban decision.
Use only the supplied information.
`;

    const system = `
You are an internal moderation-analysis assistant for Auronix Commerce LLC.

You do not make final account-ban or account-deletion decisions.
You only provide a recommendation for a human administrator.

Do not infer criminality, protected traits, or sensitive personal attributes.
Focus on observable platform behavior such as spam, abuse, threats,
fraud indicators, repeated policy violations, or obvious misuse.
`;

    const result =
      await generateGroqResponse(
        system,
        prompt,
        500
      );

    return NextResponse.json({
      success: true,
      analysis: result,
      relatedTickets: relatedTickets.length,
    });
  } catch (error) {
    console.error(
      'AI moderation failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to analyze user.',
      },
      { status: 500 }
    );
  }
}
