import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cleanText, sellerContext, sellerTickets } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic = 'force-dynamic';

async function ownedTicket(uid: string, id: string) {
  const ref = adminDb.ref(`tickets/${id}`);
  const snapshot = await ref.get();
  if (!snapshot.exists()) return null;
  const value = snapshot.val() || {};
  if (value.sellerUid !== uid) return null;
  return { ref, value };
}

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request);
    const id = cleanText(new URL(request.url).searchParams.get('id'), 160);
    const tickets = await sellerTickets(uid);
    if (id) {
      const ticket = tickets.find(item => item.id === id);
      if (!ticket) return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      return NextResponse.json({ ticket }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ tickets }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: userFacingError(error, 'Unable to load support tickets.') }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid, profile } = await sellerContext(request);
    const body = await request.json();
    const action = cleanText(body.action || 'create', 40).toLowerCase();
    const now = Date.now();

    if (action === 'create') {
      const subject = cleanText(body.subject, 150);
      const category = cleanText(body.category, 100);
      const message = cleanText(body.message, 5000);
      const priority = ['low', 'normal', 'high', 'urgent'].includes(cleanText(body.priority, 20).toLowerCase())
        ? cleanText(body.priority, 20).toLowerCase()
        : 'normal';
      if (!subject || !category || message.length < 10) return NextResponse.json({ error: 'Subject, category and a detailed message are required.' }, { status: 400 });
      const ticket = {
        name: profile.name || profile.displayName || profile.email || '',
        email: profile.email || '',
        sellerUid: uid,
        sellerEmail: profile.email || '',
        category,
        subject,
        message,
        priority,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        lastCustomerReplyAt: now,
      };
      const ref = adminDb.ref('tickets').push();
      await ref.set(ticket);
      return NextResponse.json({ success: true, ticket: { id: ref.key, ...ticket, messages: [] } }, { status: 201 });
    }

    const id = cleanText(body.id, 160);
    if (!id) return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
    const owned = await ownedTicket(uid, id);
    if (!owned) return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });

    if (action === 'reply') {
      const message = cleanText(body.message, 5000);
      if (message.length < 1) return NextResponse.json({ error: 'Reply cannot be empty.' }, { status: 400 });
      const messageRef = owned.ref.child('messages').push();
      await messageRef.set({ role: 'customer', content: message, createdAt: now });
      await owned.ref.update({ updatedAt: now, lastCustomerReplyAt: now, status: owned.value.status === 'closed' ? 'open' : owned.value.status || 'open' });
      return NextResponse.json({ success: true, message: { id: messageRef.key, role: 'customer', content: message, createdAt: now } });
    }

    if (action === 'rate') {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
      await owned.ref.update({ rating, ratingUpdatedAt: now, updatedAt: now });
      return NextResponse.json({ success: true, rating });
    }

    if (action === 'close') {
      await owned.ref.update({ status: 'closed', closedBySellerAt: now, updatedAt: now });
      return NextResponse.json({ success: true, status: 'closed' });
    }

    return NextResponse.json({ error: 'Unsupported support action.' }, { status: 400 });
  } catch (error) {
    console.error('Seller support action failed:', error);
    return NextResponse.json({ error: userFacingError(error, 'Unable to update this support ticket.') }, { status: 500 });
  }
}
