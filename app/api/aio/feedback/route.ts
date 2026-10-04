import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  responseId: z.string().trim().min(6).max(160),
  conversationId: z.string().trim().min(6).max(160),
  rating: z.enum(['helpful', 'not_helpful']),
  feedback: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'aio-feedback', body, {
      limit: 60,
      windowMs: 60 * 60_000,
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid feedback.' }, { status: 400 });
    }

    const ref = adminDb.ref('aioFeedback').push();
    await ref.set({
      responseId: parsed.data.responseId,
      conversationId: parsed.data.conversationId,
      rating: parsed.data.rating,
      feedback: parsed.data.feedback || '',
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked) {
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    console.error('[AIO feedback] Failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to save feedback.' }, { status: 503 });
  }
}
