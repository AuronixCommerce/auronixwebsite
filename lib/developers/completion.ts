import { adminDb } from "@/lib/firebase-admin";
import { scheduleAccountEvents } from "@/lib/developers/events";
import { randomBytes } from "crypto";
import {
  bodyJson,
  DeveloperError,
  fail,
  getPricing,
  hash,
  json,
  rateLimit,
  reserve,
  settle,
} from "@/lib/developers/server";
import {
  parseCompletion,
  pricingReady,
  tokenCost,
} from "@/lib/developers/model";
import { complete, providerModel } from "@/lib/developers/provider";
export async function executeCompletion(
  request: Request,
  u: { uid: string; keyId: string; models?: string[] },
) {
  const started = Date.now();
  let selectedModel = "unknown";
  let hadReservation = false;
  let reservation: { uid: string; id: string } | null = null;
  try {
    await rateLimit(u.uid, "api-attempts", 300);
    const pricing = await getPricing();
    if (!pricingReady(pricing))
      throw new DeveloperError(
        "API access is paused until pricing is published. No credits were charged.",
        503,
        "api_paused",
      );
    let input;
    try {
      input = parseCompletion(await bodyJson(request));
    } catch (e) {
      if (e instanceof DeveloperError) throw e;
      throw new DeveloperError(
        e instanceof Error ? e.message : "Invalid request.",
      );
    }
    selectedModel = input.model;
    if (u.models && !u.models.includes(input.model))
      throw new DeveloperError(
        "This API key cannot use the selected model.",
        403,
        "model_not_allowed",
      );
    const model = await providerModel(input.model),
      rate = pricing.rates[input.model];
    const key = request.headers.get("idempotency-key");
    if (key && !/^[a-zA-Z0-9_-]{8,128}$/.test(key))
      throw new DeveloperError(
        "Idempotency-Key must contain 8–128 letters, digits, hyphens, or underscores.",
      );
    const id = key ? hash(key) : randomBytes(20).toString("hex");
    await reserve(
      u.uid,
      id,
      tokenCost(input.inputBound, input.maxTokens, rate),
      input.model,
      u.keyId,
      pricing.requestsPerMinute,
      hash(JSON.stringify(input)),
      rate,
    );
    reservation = { uid: u.uid, id };
    hadReservation = true;
    let answer;
    try {
      answer = await complete(input, model);
    } catch {
      throw new DeveloperError(
        "The model provider could not complete this request. The credit hold will be released.",
        502,
        "provider_error",
      );
    }
    const charge = tokenCost(
      answer.usage.prompt_tokens,
      answer.usage.completion_tokens,
      rate,
    );
    const balance = await settle(u.uid, id, answer.usage, charge, {
      durationMs: Date.now() - started,
      statusCode: 200,
    });
    reservation = null;
    try {
      await scheduleAccountEvents(u.uid);
    } catch {
      /* Delivery failures never change a settled API charge or result. */
    }
    return json(
      {
        id: `aio-${id}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: input.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: answer.content },
            finish_reason: answer.finishReason,
          },
        ],
        usage: {
          ...answer.usage,
          total_tokens:
            answer.usage.prompt_tokens + answer.usage.completion_tokens,
        },
        billing: {
          charged_units: charge,
          units_per_credit: 1_000_000,
          available_units: balance,
        },
      },
      200,
      { "X-Request-ID": `aio-${id}` },
    );
  } catch (e) {
    if (reservation) {
      try {
        await settle(reservation.uid, reservation.id, undefined, 0, {
          durationMs: Date.now() - started,
          errorCode:
            e instanceof DeveloperError ? e.code : "service_unavailable",
          statusCode: e instanceof DeveloperError ? e.status : 503,
        });
      } catch {
        /* Pending holds expire after two minutes and are recovered on the next wallet/API transaction. */
      }
    }
    if (!hadReservation) {
      const attemptId = randomBytes(20).toString("hex");
      await adminDb
        .ref(`aioDeveloperUsage/${u.uid}/${started}_${attemptId}`)
        .set({
          id: attemptId,
          requestId: attemptId,
          createdAt: started,
          finishedAt: Date.now(),
          durationMs: Date.now() - started,
          model: selectedModel,
          keyId: u.keyId,
          status: "rejected",
          charged: 0,
          errorCode:
            e instanceof DeveloperError ? e.code : "service_unavailable",
          statusCode: e instanceof DeveloperError ? e.status : 503,
        })
        .catch(() => undefined);
    }
    try {
      await scheduleAccountEvents(u.uid);
    } catch {}
    return fail(e);
  }
}
