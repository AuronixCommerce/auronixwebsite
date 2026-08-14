import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const ticketId = String(body.ticketId || '').trim();

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required.' },
        { status: 400 }
      );
    }

    const ticketRef = adminDb.ref(
      `tickets/${ticketId}`
    );

    const snapshot = await ticketRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found.' },
        { status: 404 }
      );
    }

    await ticketRef.remove();

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted.',
    });
  } catch (error) {
    console.error('Ticket deletion failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to delete ticket.',
      },
      { status: 500 }
    );
  }
}
