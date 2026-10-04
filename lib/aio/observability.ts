import { adminDb } from '@/lib/firebase-admin';

export type AioLogEntry = {
  requestId: string;
  intent: string;
  sourceIds: string[];
  toolNames?: string[];
  provider?: string;
  model?: string;
  usedFallback?: boolean;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  authenticated: boolean;
  createdAt: number;
};

export async function writeAioLog(entry: AioLogEntry) {
  try {
    await adminDb.ref(`aioLogs/${entry.requestId}`).set(entry);
  } catch (error) {
    console.error('[AIO observability] Failed to write log:', error);
  }
}
