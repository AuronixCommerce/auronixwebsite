import Groq from "groq-sdk";
import { adminDb } from "@/lib/firebase-admin";
import { resolveAioModel } from "@/lib/aio/models";
import { DeveloperError } from "./server";
import type { parseCompletion } from "./model";
export async function providerModel(model: string) {
  if (!process.env.GROQ_API_KEY?.trim())
    throw new DeveloperError(
      "The API provider is not configured. No credits were charged.",
      503,
      "provider_unavailable",
    );
  const settings = (await adminDb.ref("settings/ai").get()).val() || {};
  if (settings.enabled === false)
    throw new DeveloperError(
      "AIO is temporarily paused.",
      503,
      "provider_unavailable",
    );
  return (
    resolveAioModel(model, settings) ||
    process.env.GROQ_MODEL?.trim() ||
    "openai/gpt-oss-120b"
  );
}
export async function complete(
  input: ReturnType<typeof parseCompletion>,
  model: string,
) {
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY!.trim(),
    maxRetries: 0,
    timeout: 25_000,
  });
  const result = await client.chat.completions.create({
    model,
    messages: input.messages,
    max_completion_tokens: input.maxTokens,
    temperature: input.temperature,
    stream: false,
  });
  const usage = result.usage,
    message = result.choices?.[0]?.message?.content;
  if (
    !usage ||
    !Number.isSafeInteger(usage.prompt_tokens) ||
    !Number.isSafeInteger(usage.completion_tokens) ||
    usage.prompt_tokens < 0 ||
    usage.completion_tokens < 0 ||
    !message?.trim()
  )
    throw new DeveloperError(
      "The provider did not return a billable response. Your credit hold will be released.",
      502,
      "provider_error",
    );
  return {
    content: message,
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
    },
    finishReason: result.choices[0].finish_reason,
  };
}
