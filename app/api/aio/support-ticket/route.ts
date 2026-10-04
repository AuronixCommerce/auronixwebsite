import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';
import { TICKET_CATEGORIES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  category: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'aio-support-ticket', body, {
      limit: 8,
      windowMs: 60 * 60_000,
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Please review the support-ticket details and try again.' },
        { status: 400 }
      );
    }

    const category = TICKET_CATEGORIES.find(
      (item) => item.toLowerCase() === parsed.data.category.toLowerCase()
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Choose a valid support category.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const ref = adminDb.ref('tickets').push();

    await ref.set({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: 'open',
      source: 'aio',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        ticketId: ref.key,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked) {
      return NextResponse.json(blocked.body, { status: blocked.status });
    }

    console.error('[AIO support ticket] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'AIO could not create the support ticket. Please try again.' },
      { status: 503 }
    );
  }
}
