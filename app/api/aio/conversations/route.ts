import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/server-auth';
import {
  deleteAuthenticatedAioConversation,
  getAuthenticatedAioConversation,
  listAuthenticatedAioConversations,
} from '@/lib/aio/history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await verifyIdToken(request);
    const id = new URL(request.url).searchParams.get('id') || '';

    if (id) {
      const conversation = await getAuthenticatedAioConversation(user.uid, id);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
      }
      return NextResponse.json({ conversation }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const conversations = await listAuthenticatedAioConversations(user.uid);
    return NextResponse.json({ conversations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Sign in to access saved AIO conversations.' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyIdToken(request);
    const body = await request.json();
    const deleted = await deleteAuthenticatedAioConversation(user.uid, String(body?.id || ''));

    if (!deleted) {
      return NextResponse.json({ error: 'Invalid conversation.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete this conversation.' }, { status: 401 });
  }
}
