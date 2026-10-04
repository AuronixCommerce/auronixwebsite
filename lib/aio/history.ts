import { adminDb } from '@/lib/firebase-admin';

const SAFE_ID = /^[a-zA-Z0-9_-]{8,128}$/;

function clean(value: string, max: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
}

export function normalizeConversationId(value: string | undefined) {
  const candidate = String(value || '').trim();
  return SAFE_ID.test(candidate) ? candidate : null;
}

function titleFromMessage(value: string) {
  const title = clean(value, 64);
  return title || 'Auronix conversation';
}

export async function saveAuthenticatedAioTurn(input: {
  uid: string;
  conversationId: string;
  userContent: string;
  assistantContent: string;
  sourceIds: string[];
  model?: string;
}) {
  const conversationId = normalizeConversationId(input.conversationId);
  if (!conversationId) return;

  const base = adminDb.ref(`aioConversations/${input.uid}/${conversationId}`);
  const snapshot = await base.get();
  const now = Date.now();

  const userRef = base.child('messages').push();
  const assistantRef = base.child('messages').push();

  await Promise.all([
    userRef.set({
      role: 'user',
      content: input.userContent.slice(0, 6000),
      createdAt: now,
    }),
    assistantRef.set({
      role: 'assistant',
      content: input.assistantContent.slice(0, 16000),
      createdAt: now + 1,
      sourceIds: input.sourceIds.slice(0, 8),
      model: input.model || '',
    }),
    base.update({
      title: snapshot.exists()
        ? String(snapshot.val()?.title || titleFromMessage(input.userContent))
        : titleFromMessage(input.userContent),
      createdAt: snapshot.exists()
        ? Number(snapshot.val()?.createdAt || now)
        : now,
      updatedAt: now,
      lastMessageAt: now,
    }),
  ]);
}

export async function listAuthenticatedAioConversations(uid: string) {
  const snapshot = await adminDb.ref(`aioConversations/${uid}`).get();
  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val() as Record<string, Record<string, unknown>>)
    .map(([id, value]) => ({
      id,
      title: String(value.title || 'Auronix conversation').slice(0, 100),
      createdAt: Number(value.createdAt || 0),
      updatedAt: Number(value.updatedAt || 0),
      lastMessageAt: Number(value.lastMessageAt || 0),
    }))
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, 50);
}

export async function getAuthenticatedAioConversation(uid: string, id: string) {
  const conversationId = normalizeConversationId(id);
  if (!conversationId) return null;

  const snapshot = await adminDb.ref(`aioConversations/${uid}/${conversationId}`).get();
  if (!snapshot.exists()) return null;

  const value = snapshot.val() || {};
  const messages = value.messages && typeof value.messages === 'object'
    ? Object.entries(value.messages as Record<string, Record<string, unknown>>)
        .map(([messageId, message]) => ({
          id: messageId,
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: String(message.content || '').slice(0, 16000),
          createdAt: Number(message.createdAt || 0),
          sourceIds: Array.isArray(message.sourceIds) ? message.sourceIds.slice(0, 8) : [],
        }))
        .sort((a, b) => a.createdAt - b.createdAt)
    : [];

  return {
    id: conversationId,
    title: String(value.title || 'Auronix conversation').slice(0, 100),
    createdAt: Number(value.createdAt || 0),
    updatedAt: Number(value.updatedAt || 0),
    messages,
  };
}

export async function deleteAuthenticatedAioConversation(uid: string, id: string) {
  const conversationId = normalizeConversationId(id);
  if (!conversationId) return false;

  await adminDb.ref(`aioConversations/${uid}/${conversationId}`).remove();
  return true;
}
