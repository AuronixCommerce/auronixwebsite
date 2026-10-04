import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { findPremadeAnswer } from '@/lib/ai-premade-memory';
import { getMaintenanceContext } from '@/lib/server-maintenance-context';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

import { buildAioActions } from '@/lib/aio/actions';
import { saveAuthenticatedAioTurn } from '@/lib/aio/history';
import { writeAioLog } from '@/lib/aio/observability';
import { AioProviderError, createAioProvider, isAioConfigured } from '@/lib/aio/provider';
import {
  adminKnowledgeRecords,
  companyKnowledgeRecord,
  faqKnowledgeRecords,
  getStaticAioKnowledge,
  knowledgeToSource,
  retrieveAioKnowledge,
} from '@/lib/aio/retrieval';
import { routeAioQuery } from '@/lib/aio/router';
import { buildAioSystemPrompt } from '@/lib/aio/system-prompt';
import type {
  AioChatMessage,
  AioKnowledgeRecord,
  AioStreamEvent,
} from '@/lib/aio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(6000),
});

const requestSchema = z.object({
  pathname: z.string().trim().max(500).default('/'),
  conversationId: z.string().trim().min(8).max(128),
  requestId: z.string().trim().min(8).max(160).optional(),
  messages: z.array(messageSchema).min(1).max(40),
  context: z.object({
    pageTitle: z.string().trim().max(240).optional(),
    selectedText: z.string().trim().max(4000).optional(),
    relevantSection: z.string().trim().max(600).optional(),
  }).optional(),
});

type OptionalIdentity = {
  uid: string;
  role?: string;
} | null;

function encodeEvent(event: AioStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function streamResponse(
  producer: (send: (event: AioStreamEvent) => void) => Promise<void>
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AioStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      try {
        await producer(send);
      } catch (error) {
        console.error('[AIO stream] Unhandled stream error:', error);
        send({
          type: 'error',
          message: 'AIO is temporarily unable to respond. Please try again.',
          code: 'STREAM_FAILED',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function optionalIdentity(request: Request): Promise<OptionalIdentity> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
    };
  } catch {
    return null;
  }
}

function cleanPathname(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value.slice(0, 500);
}

function safeNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), min), max)
    : fallback;
}

function chunks(value: string, size = 120) {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    result.push(value.slice(index, index + size));
  }
  return result;
}

function safeProviderError(error: unknown) {
  if (error instanceof AioProviderError) {
    return {
      message: error.message,
      code: error.code.toUpperCase(),
    };
  }

  return {
    message: 'AIO is temporarily unable to respond. Please try again.',
    code: 'PROVIDER_FAILED',
  };
}

function buildDynamicRecords(
  company: unknown,
  faqs: unknown,
  adminKnowledge: unknown
) {
  const records: AioKnowledgeRecord[] = [...getStaticAioKnowledge()];

  if (company && typeof company === 'object') {
    const companyRecord = companyKnowledgeRecord(company as Record<string, unknown>);
    if (companyRecord) records.push(companyRecord);
  }

  records.push(...faqKnowledgeRecords(faqs));
  records.push(...adminKnowledgeRecords(adminKnowledge));

  return records;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid AIO request.' },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Please send a valid message.' },
      { status: 400 }
    );
  }

  const identity = await optionalIdentity(request);

  try {
    await protectPublicRequest(request, 'aio-chat', body, {
      limit: identity ? 90 : 30,
      windowMs: 15 * 60_000,
    });
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked) {
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    throw error;
  }

  const requestId = parsed.data.requestId || randomUUID();
  const pathname = cleanPathname(parsed.data.pathname);
  const messages = parsed.data.messages.slice(-18) as AioChatMessage[];
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content || '';

  if (!latestUserMessage) {
    return NextResponse.json(
      { success: false, error: 'Please enter a message.' },
      { status: 400 }
    );
  }

  let maintenance;
  try {
    maintenance = await getMaintenanceContext(pathname);
  } catch (error) {
    console.error('[AIO] Maintenance context failed:', error);
    maintenance = null;
  }

  const aiMaintenanceActive = Boolean(
    maintenance?.global?.aiActive || maintenance?.page?.aiActive
  );

  if (aiMaintenanceActive) {
    const state = maintenance?.global?.aiActive
      ? maintenance.global
      : maintenance?.page;
    const response = [
      `**${String(state?.aiTitle || 'Auronix Intelligence One is temporarily unavailable.')}**`,
      String(state?.aiMessage || 'Please try again shortly.'),
      state?.aiEndAt
        ? `Expected completion: **${new Date(Number(state.aiEndAt)).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}**.`
        : 'No exact completion time has been provided.',
    ].join('\n\n');

    return streamResponse(async (send) => {
      send({ type: 'message_start', requestId });
      send({ type: 'status', label: 'AIO maintenance' });
      for (const token of chunks(response)) {
        send({ type: 'token', token });
      }
      send({
        type: 'message_complete',
        requestId,
        answerSource: 'auronix',
      });
    });
  }

  let snapshots;
  try {
    snapshots = await Promise.all([
      adminDb.ref('site/settings/company').get(),
      adminDb.ref('faqs').get(),
      adminDb.ref('aioKnowledge').get(),
      adminDb.ref('settings/ai').get(),
    ]);
  } catch (error) {
    console.error('[AIO] Knowledge/settings load failed:', error);
    return NextResponse.json(
      { success: false, error: 'AIO could not reach Auronix knowledge right now.' },
      { status: 503 }
    );
  }

  const [companySnapshot, faqSnapshot, knowledgeSnapshot, settingsSnapshot] = snapshots;
  const settings = settingsSnapshot.exists()
    ? (settingsSnapshot.val() as Record<string, unknown>)
    : {};

  if (settings.publicChatEnabled === false || settings.enabled === false) {
    return streamResponse(async (send) => {
      send({ type: 'message_start', requestId });
      send({ type: 'token', token: 'Auronix Intelligence One is temporarily unavailable. You can still use Auronix Support.' });
      send({
        type: 'action',
        action: {
          id: 'open-support',
          label: 'Open Auronix Support',
          href: '/support',
          kind: 'support',
        },
      });
      send({
        type: 'message_complete',
        requestId,
        answerSource: 'auronix',
      });
    });
  }

  const decision = routeAioQuery(latestUserMessage, messages, pathname);
  const retrievalLimit = safeNumber(settings.aioRetrievalLimit, 4, 1, 6);
  const maxResponseTokens = safeNumber(settings.aioMaxResponseTokens, 1100, 200, 3000);
  const knowledgeEnabled = settings.knowledgeEnabled !== false;

  const records = buildDynamicRecords(
    companySnapshot.exists() ? companySnapshot.val() : {},
    faqSnapshot.exists() ? faqSnapshot.val() : {},
    knowledgeSnapshot.exists() ? knowledgeSnapshot.val() : {}
  );

  const ranked = knowledgeEnabled && decision.requiresRetrieval
    ? retrieveAioKnowledge(decision.retrievalQuery, records, {
        pathname,
        intent: decision.intent,
        limit: retrievalLimit,
        allowAuthenticated: Boolean(identity),
      })
    : [];

  const evidence = ranked.map((entry) => entry.record);
  const sources = evidence.map(knowledgeToSource);
  const actions = buildAioActions(decision, sources);
  const memoryMatch = findPremadeAnswer(latestUserMessage);

  if (memoryMatch && !decision.continuation) {
    return streamResponse(async (send) => {
      send({ type: 'message_start', requestId });
      send({ type: 'status', label: 'Found in Auronix knowledge' });
      for (const source of sources.slice(0, 3)) {
        send({ type: 'source', source });
      }
      for (const action of actions) {
        send({ type: 'action', action });
      }
      for (const token of chunks(memoryMatch.answer)) {
        send({ type: 'token', token });
      }
      send({
        type: 'message_complete',
        requestId,
        answerSource: 'premade',
      });

      await writeAioLog({
        requestId,
        intent: decision.intent,
        sourceIds: sources.map((source) => source.id),
        provider: 'premade-memory',
        model: 'deterministic',
        usedFallback: false,
        latencyMs: Date.now() - startedAt,
        success: true,
        authenticated: Boolean(identity),
        createdAt: Date.now(),
      });

      if (identity) {
        await saveAuthenticatedAioTurn({
          uid: identity.uid,
          conversationId: parsed.data.conversationId,
          userContent: latestUserMessage,
          assistantContent: memoryMatch.answer,
          sourceIds: sources.map((source) => source.id),
          model: 'deterministic',
        }).catch((error) => console.error('[AIO history] Save failed:', error));
      }
    });
  }

  if (!isAioConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Auronix Intelligence One is not configured.' },
      { status: 503 }
    );
  }

  const systemPrompt = buildAioSystemPrompt({
    pathname,
    decision,
    evidence,
    currentDate: new Date().toISOString(),
  });

  const provider = createAioProvider({
    model: typeof settings.aioModel === 'string' ? settings.aioModel : undefined,
    fallbackModel:
      typeof settings.aioFallbackModel === 'string'
        ? settings.aioFallbackModel
        : undefined,
  });

  const providerMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  return streamResponse(async (send) => {
    let fullText = '';
    let providerName = '';
    let providerModel = '';
    let usedFallback = false;
    let success = false;
    let errorCode = '';

    send({ type: 'message_start', requestId });
    send({
      type: 'status',
      label: decision.requiresRetrieval ? 'Searching Auronix…' : 'AIO is analyzing…',
    });

    for (const source of sources) {
      send({ type: 'source', source });
    }

    for (const action of actions) {
      send({ type: 'action', action });
    }

    if (decision.requiresLiveData && decision.requiresAuthentication) {
      send({
        type: 'status',
        label: 'Application verification required',
      });
    } else {
      send({ type: 'status', label: 'AIO is analyzing…' });
    }

    try {
      for await (const part of provider.stream({
        messages: providerMessages,
        maxTokens: maxResponseTokens,
        temperature: 0.2,
      })) {
        providerName = part.info.provider;
        providerModel = part.info.model;
        usedFallback = part.info.usedFallback;
        fullText += part.token;
        send({ type: 'token', token: part.token });
      }

      success = Boolean(fullText.trim());

      if (!success) {
        throw new AioProviderError('AIO returned an empty response.', 'unavailable');
      }

      send({
        type: 'message_complete',
        requestId,
        answerSource: sources.length ? 'auronix' : 'general',
        provider: providerName,
        model: providerModel,
        usedFallback,
      });

      if (identity) {
        await saveAuthenticatedAioTurn({
          uid: identity.uid,
          conversationId: parsed.data.conversationId,
          userContent: latestUserMessage,
          assistantContent: fullText,
          sourceIds: sources.map((source) => source.id),
          model: providerModel,
        }).catch((error) => console.error('[AIO history] Save failed:', error));
      }
    } catch (error) {
      const safe = safeProviderError(error);
      errorCode = safe.code;
      send({
        type: 'error',
        message: safe.message,
        code: safe.code,
      });
    } finally {
      await writeAioLog({
        requestId,
        intent: decision.intent,
        sourceIds: sources.map((source) => source.id),
        toolNames: actions.map((action) => action.id),
        provider: providerName || provider.name,
        model: providerModel,
        usedFallback,
        latencyMs: Date.now() - startedAt,
        success,
        errorCode: errorCode || undefined,
        authenticated: Boolean(identity),
        createdAt: Date.now(),
      });
    }
  });
}
