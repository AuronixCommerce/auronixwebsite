import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

const SAFE_ID = /^[a-zA-Z0-9_-]{8,128}$/;

function clean(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export function normalizeConversationId(value: string | undefined) {
  const candidate = String(value || "").trim();
  return SAFE_ID.test(candidate) ? candidate : null;
}

function titleFromMessage(value: string) {
  const title = clean(value, 64);
  return title || "Auronix conversation";
}

export async function saveAuthenticatedAioTurn(input: {
  uid: string;
  conversationId: string;
  userContent: string;
  assistantContent: string;
  sourceIds: string[];
  model?: string;
  requestId?: string;
  sources?: unknown[];
}) {
  const conversationId = normalizeConversationId(input.conversationId);
  if (!conversationId) return;

  const base = adminDb.ref(`aioConversations/${input.uid}/${conversationId}`);
  const now = Date.now();
  const turnId = createHash("sha256")
    .update(input.requestId || `${now}-${Math.random()}`)
    .digest("hex");
  await base.transaction((current) => ({
    ...(current || {}),
    title: current?.title || titleFromMessage(input.userContent),
    createdAt: current?.createdAt || now,
    updatedAt: now,
    lastMessageAt: now,
    messages: {
      ...(current?.messages || {}),
      [`${turnId}-user`]: {
        role: "user",
        content: input.userContent.slice(0, 6000),
        createdAt: now,
      },
      [`${turnId}-assistant`]: {
        role: "assistant",
        content: input.assistantContent.slice(0, 16000),
        createdAt: now + 1,
        sourceIds: input.sourceIds.slice(0, 8),
        sources: input.sources || [],
        requestId: input.requestId || "",
        model: input.model || "",
        pinned: current?.messages?.[`${turnId}-assistant`]?.pinned === true,
      },
    },
  }));
}

export async function listAuthenticatedAioConversations(
  uid: string,
  query = "",
) {
  const snapshot = await adminDb.ref(`aioConversations/${uid}`).get();
  if (!snapshot.exists()) return [];

  return Object.entries(
    snapshot.val() as Record<string, Record<string, unknown>>,
  )
    .map(([id, value]) => ({
      id,
      title: String(value.title || "Auronix conversation").slice(0, 100),
      createdAt: Number(value.createdAt || 0),
      updatedAt: Number(value.updatedAt || 0),
      lastMessageAt: Number(value.lastMessageAt || 0),
      pinnedCount: Object.values(
        (value.messages || {}) as Record<string, any>,
      ).filter((m) => m.pinned === true).length,
      searchText: `${value.title || ""} ${Object.values(
        (value.messages || {}) as Record<string, any>,
      )
        .map((m) => m.content || "")
        .join(" ")}`.toLowerCase(),
    }))
    .filter(
      (c) =>
        !query ||
        c.searchText.includes(query.trim().toLowerCase().slice(0, 200)),
    )
    .map(({ searchText, ...c }) => c)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, 50);
}

export async function getAuthenticatedAioConversation(uid: string, id: string) {
  const conversationId = normalizeConversationId(id);
  if (!conversationId) return null;

  const snapshot = await adminDb
    .ref(`aioConversations/${uid}/${conversationId}`)
    .get();
  if (!snapshot.exists()) return null;

  const value = snapshot.val() || {};
  const messages =
    value.messages && typeof value.messages === "object"
      ? Object.entries(
          value.messages as Record<string, Record<string, unknown>>,
        )
          .map(([messageId, message]) => ({
            id: String(message.requestId || messageId),
            pinned: message.pinned === true,
            sources: Array.isArray(message.sources) ? message.sources : [],
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || "").slice(0, 16000),
            createdAt: Number(message.createdAt || 0),
            sourceIds: Array.isArray(message.sourceIds)
              ? message.sourceIds.slice(0, 8)
              : [],
          }))
          .sort((a, b) => a.createdAt - b.createdAt)
      : [];

  return {
    id: conversationId,
    title: String(value.title || "Auronix conversation").slice(0, 100),
    createdAt: Number(value.createdAt || 0),
    updatedAt: Number(value.updatedAt || 0),
    messages,
  };
}

export async function deleteAuthenticatedAioConversation(
  uid: string,
  id: string,
) {
  const conversationId = normalizeConversationId(id);
  if (!conversationId) return false;

  await adminDb.ref(`aioConversations/${uid}/${conversationId}`).remove();
  return true;
}

export async function updateAuthenticatedAioConversation(
  uid: string,
  id: string,
  change: { title?: string; messageId?: string; pinned?: boolean },
) {
  const conversationId = normalizeConversationId(id);
  if (!conversationId) return false;
  const ref = adminDb.ref(`aioConversations/${uid}/${conversationId}`);
  const result = await ref.transaction((value) => {
    if (!value) return value;
    if (change.title !== undefined)
      return {
        ...value,
        title: change.title.trim().slice(0, 100),
        updatedAt: Date.now(),
      };
    const key = Object.keys(value.messages || {}).find(
      (k) =>
        k === change.messageId ||
        value.messages[k].requestId === change.messageId,
    );
    if (!key || value.messages[key].role !== "assistant") return;
    return {
      ...value,
      messages: {
        ...value.messages,
        [key]: { ...value.messages[key], pinned: change.pinned === true },
      },
      updatedAt: Date.now(),
    };
  });
  return result.committed && result.snapshot.exists();
}
