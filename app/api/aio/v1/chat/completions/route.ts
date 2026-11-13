import { randomBytes } from "crypto";
import {
  apiIdentity,
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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  let reservation: { uid: string; id: string } | null = null;
  try {
    const u = await apiIdentity(request);
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
    const balance = await settle(u.uid, id, answer.usage, charge);
    reservation = null;
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
        await settle(reservation.uid, reservation.id);
      } catch {
        /* Pending holds expire after two minutes and are recovered on the next wallet/API transaction. */
      }
    }
    return fail(e);
  }
}
