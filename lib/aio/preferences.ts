import { normalizeAioModelId, type AioModelId } from "./models";
import type { AioChatMessage } from "./types";
export const CHAT_PREFERENCES_KEY = "auronix-ai-preferences-v1";
export type ReplyLength = "adaptive" | "brief" | "detailed";
export type ReplyTone = "professional" | "friendly" | "direct";
export type ChatPreferences = {
  model: AioModelId;
  replyLength: ReplyLength;
  tone: ReplyTone;
  followReplyDefaults: boolean;
  rememberHistory: boolean;
  useContext: boolean;
  showSources: boolean;
  enterToSend: boolean;
};
export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  model: "aio-2",
  replyLength: "adaptive",
  tone: "professional",
  followReplyDefaults: true,
  rememberHistory: true,
  useContext: true,
  showSources: true,
  enterToSend: true,
};
export function normalizeChatPreferences(raw: unknown): ChatPreferences {
  const p = (
    raw && typeof raw === "object" ? raw : {}
  ) as Partial<ChatPreferences>;
  return {
    model: normalizeAioModelId(p.model),
    replyLength: ["adaptive", "brief", "detailed"].includes(
      String(p.replyLength),
    )
      ? p.replyLength!
      : DEFAULT_CHAT_PREFERENCES.replyLength,
    tone: ["professional", "friendly", "direct"].includes(String(p.tone))
      ? p.tone!
      : DEFAULT_CHAT_PREFERENCES.tone,
    ...Object.fromEntries(
      [
        "rememberHistory",
        "useContext",
        "showSources",
        "enterToSend",
        "followReplyDefaults",
      ].map((key) => [
        key,
        typeof p[key as keyof ChatPreferences] === "boolean"
          ? p[key as keyof ChatPreferences]
          : DEFAULT_CHAT_PREFERENCES[key as keyof ChatPreferences],
      ]),
    ),
  } as ChatPreferences;
}
/** A new conversation is a real context boundary, even when older messages stay visible. */
export function currentChatContext(
  messages: Array<AioChatMessage & { sessionBoundary?: boolean }>,
  useContext = true,
): AioChatMessage[] {
  let boundary = -1;
  messages.forEach((m, i) => {
    if (m.sessionBoundary) boundary = i;
  });
  const current = messages
    .slice(boundary + 1)
    .filter((m) => !m.sessionBoundary && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 6000) }));
  if (!useContext) {
    const latest = [...current].reverse().find((m) => m.role === "user");
    return latest ? [latest] : [];
  }
  const bounded = current.slice(-18);
  while (bounded.length && bounded[0].role !== "user") bounded.shift();
  return bounded;
}
