import Groq from 'groq-sdk';
import type {
  AioProviderInfo,
  AioProviderRequest,
} from '@/lib/aio/types';

export interface AIProvider {
  readonly name: string;
  readonly supportsTools: boolean;
  readonly supportsVision: boolean;
  generate(request: AioProviderRequest): Promise<{ text: string; info: AioProviderInfo }>;
  stream(request: AioProviderRequest): AsyncGenerator<{ token: string; info: AioProviderInfo }>;
}

export class AioProviderError extends Error {
  constructor(
    message: string,
    public code:
      | 'not_configured'
      | 'rate_limited'
      | 'unavailable'
      | 'auth'
      | 'timeout'
      | 'context_too_long'
      | 'unknown' = 'unknown'
  ) {
    super(message);
  }
}

type ProviderConfig = {
  provider: string;
  apiKey: string;
  model: string;
  fallbackModel?: string;
};

function safeModel(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 160 || !/^[a-zA-Z0-9._:/-]+$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

export function getAioProviderConfig(overrides?: {
  model?: string;
  fallbackModel?: string;
}): ProviderConfig {
  const provider = (process.env.AIO_PROVIDER || 'groq').trim().toLowerCase();
  const apiKey = (process.env.AIO_API_KEY || process.env.GROQ_API_KEY || '').trim();
  const defaultModel = safeModel(
    process.env.AIO_MODEL || process.env.GROQ_MODEL,
    'openai/gpt-oss-120b'
  );

  const model = safeModel(overrides?.model, defaultModel);
  const fallbackCandidate = overrides?.fallbackModel || process.env.AIO_FALLBACK_MODEL || '';
  const fallbackModel = fallbackCandidate
    ? safeModel(fallbackCandidate, '')
    : undefined;

  return {
    provider,
    apiKey,
    model,
    fallbackModel: fallbackModel && fallbackModel !== model ? fallbackModel : undefined,
  };
}

function normalizeProviderError(error: unknown): AioProviderError {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();

  if (lower.includes('429') || lower.includes('rate limit')) {
    return new AioProviderError('AIO is temporarily busy. Please try again.', 'rate_limited');
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('api key') || lower.includes('authentication')) {
    return new AioProviderError('AIO is temporarily unavailable.', 'auth');
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new AioProviderError('AIO took too long to respond. Please retry.', 'timeout');
  }
  if (lower.includes('context') && (lower.includes('long') || lower.includes('length'))) {
    return new AioProviderError('This conversation is too long to process in one request.', 'context_too_long');
  }
  if (lower.includes('503') || lower.includes('502') || lower.includes('unavailable')) {
    return new AioProviderError('AIO is temporarily unavailable. Please try again.', 'unavailable');
  }

  return new AioProviderError('AIO is temporarily unable to respond. Please try again.', 'unknown');
}

class GroqAioProvider implements AIProvider {
  readonly name = 'groq';
  readonly supportsTools = false;
  readonly supportsVision = false;

  private client: Groq;
  private model: string;
  private fallbackModel?: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new AioProviderError('AIO is not configured.', 'not_configured');
    }

    this.client = new Groq({ apiKey: config.apiKey });
    this.model = config.model;
    this.fallbackModel = config.fallbackModel;
  }

  private completionArgs(request: AioProviderRequest, model: string, stream: boolean) {
    return {
      model,
      messages: request.messages,
      temperature: Math.min(Math.max(request.temperature ?? 0.2, 0), 1),
      max_completion_tokens: Math.min(Math.max(request.maxTokens, 120), 4000),
      reasoning_effort: 'medium' as const,
      include_reasoning: false,
      stream,
    };
  }

  async generate(request: AioProviderRequest) {
    const models = [request.model || this.model, request.fallbackModel || this.fallbackModel]
      .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

    let lastError: unknown = null;

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      try {
        const completion = await this.client.chat.completions.create(
          this.completionArgs(request, model, false)
        );
        if ('choices' in completion) {
          const text = completion.choices?.[0]?.message?.content?.trim() || '';
          if (text) {
            return {
              text,
              info: {
                provider: this.name,
                model,
                fallbackModel: this.fallbackModel,
                usedFallback: index > 0,
              },
            };
          }
        }
        lastError = new Error('Provider returned an empty response.');
      } catch (error) {
        lastError = error;
      }
    }

    throw normalizeProviderError(lastError);
  }

  async *stream(request: AioProviderRequest) {
    const models = [request.model || this.model, request.fallbackModel || this.fallbackModel]
      .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

    let lastError: unknown = null;

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      let emitted = false;

      try {
        const stream = await this.client.chat.completions.create(
          this.completionArgs(request, model, true)
        );

        for await (const chunk of stream) {
          const token = chunk.choices?.[0]?.delta?.content || '';
          if (!token) continue;
          emitted = true;
          yield {
            token,
            info: {
              provider: this.name,
              model,
              fallbackModel: this.fallbackModel,
              usedFallback: index > 0,
            },
          };
        }

        if (emitted) return;
        lastError = new Error('Provider returned an empty stream.');
      } catch (error) {
        lastError = error;
        if (emitted) {
          throw normalizeProviderError(error);
        }
      }
    }

    throw normalizeProviderError(lastError);
  }
}

export function createAioProvider(overrides?: {
  model?: string;
  fallbackModel?: string;
}): AIProvider {
  const config = getAioProviderConfig(overrides);

  if (config.provider !== 'groq') {
    throw new AioProviderError(
      `Unsupported AIO provider: ${config.provider}`,
      'not_configured'
    );
  }

  return new GroqAioProvider(config);
}

export function isAioConfigured() {
  const config = getAioProviderConfig();
  return config.provider === 'groq' && Boolean(config.apiKey);
}
