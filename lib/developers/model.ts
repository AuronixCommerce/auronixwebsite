export const CREDIT_UNITS = 1_000_000;
export const API_TERMS_VERSION = "2026-11-13-manual-v1";
export const MIN_TOPUP_CREDITS = 5;
export const DEVELOPER_MODELS = [
  {
    id: "aio-one",
    name: "AIO One",
    description: "Everyday text generation and concise answers.",
  },
  {
    id: "aio-2",
    name: "AIO 2",
    description: "Balanced reasoning and longer explanations.",
  },
  {
    id: "aio-2-fast",
    name: "AIO 2 Fast",
    description: "Short responses and latency-sensitive workflows.",
  },
] as const;
export type DeveloperModel = (typeof DEVELOPER_MODELS)[number]["id"];
export type ApiPricing = {
  enabled: boolean;
  usdCentsPerCredit: number;
  requestsPerMinute: number;
  rates: Record<DeveloperModel, { input: number; output: number }>;
};
export const DEFAULT_API_PRICING: ApiPricing = {
  enabled: true,
  usdCentsPerCredit: 100,
  requestsPerMinute: 30,
  rates: {
    "aio-one": { input: 250, output: 1000 },
    "aio-2": { input: 500, output: 2000 },
    "aio-2-fast": { input: 250, output: 1000 },
  },
};
export function credits(units: number) {
  return (Number(units || 0) / CREDIT_UNITS).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}
export function tokenCost(
  input: number,
  output: number,
  rate: { input: number; output: number },
) {
  return (
    Math.ceil((input * rate.input) / 1000) +
    Math.ceil((output * rate.output) / 1000)
  );
}
export function modelId(value: unknown): value is DeveloperModel {
  return DEVELOPER_MODELS.some((m) => m.id === value);
}
export function pricingReady(p: ApiPricing) {
  return (
    p.enabled === true &&
    Number.isSafeInteger(p.usdCentsPerCredit) &&
    p.usdCentsPerCredit > 0 &&
    DEVELOPER_MODELS.every(
      (m) => p.rates?.[m.id]?.input > 0 && p.rates?.[m.id]?.output > 0,
    )
  );
}
export function parsePricing(value: any): ApiPricing {
  if (
    typeof value?.enabled !== "boolean" ||
    !Number.isSafeInteger(value.usdCentsPerCredit) ||
    value.usdCentsPerCredit < 1 ||
    value.usdCentsPerCredit > 1_000_000 ||
    !Number.isSafeInteger(value.requestsPerMinute) ||
    value.requestsPerMinute < 1 ||
    value.requestsPerMinute > 300
  )
    throw Error("Set a valid price and a request limit between 1 and 300.");
  const rates = {} as ApiPricing["rates"];
  for (const m of DEVELOPER_MODELS) {
    const r = value.rates?.[m.id];
    if (
      !r ||
      !Number.isSafeInteger(r.input) ||
      !Number.isSafeInteger(r.output) ||
      r.input < 1 ||
      r.output < 1 ||
      r.input > 1_000_000_000 ||
      r.output > 1_000_000_000
    )
      throw Error("Set positive input and output rates for every model.");
    rates[m.id] = { input: r.input, output: r.output };
  }
  return {
    enabled: value.enabled,
    usdCentsPerCredit: value.usdCentsPerCredit,
    requestsPerMinute: value.requestsPerMinute,
    rates,
  };
}
export function parseCompletion(body: any) {
  if (!body || !modelId(body.model))
    throw Error("Choose aio-one, aio-2, or aio-2-fast.");
  if (body.stream !== undefined && body.stream !== false)
    throw Error("Streaming is not supported in API v1. Use stream: false.");
  const supported = new Set([
    "model",
    "messages",
    "max_tokens",
    "max_completion_tokens",
    "temperature",
    "stream",
  ]);
  if (Object.keys(body).some((k) => !supported.has(k)))
    throw Error("Unsupported parameter. See the API reference.");
  if (
    !Array.isArray(body.messages) ||
    body.messages.length < 1 ||
    body.messages.length > 32
  )
    throw Error("Send between 1 and 32 text messages.");
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    body.messages.map((m: any) => {
      if (
        !m ||
        !["system", "user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        !m.content.trim() ||
        Object.keys(m).some((k) => !["role", "content"].includes(k))
      )
        throw Error(
          "Only nonempty system, user, and assistant text messages are supported.",
        );
      return { role: m.role, content: m.content };
    });
  if (!messages.some((m) => m.role === "user"))
    throw Error("Include at least one user message.");
  const bytes = Buffer.byteLength(
    messages.map((m) => m.content).join(""),
    "utf8",
  );
  if (bytes > 16_384) throw Error("Messages exceed the 16 KB input limit.");
  if (body.max_tokens !== undefined && body.max_completion_tokens !== undefined)
    throw Error("Use only one output token limit.");
  const maxTokens = body.max_completion_tokens ?? body.max_tokens ?? 512;
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096)
    throw Error("The output token limit must be between 1 and 4096.");
  const temperature = body.temperature ?? 0.5;
  if (
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    temperature > 2
  )
    throw Error("Temperature must be between 0 and 2.");
  // UTF-8 bytes plus generous per-message overhead safely bound input tokens without estimating billable usage.
  return {
    model: body.model as DeveloperModel,
    messages,
    maxTokens,
    temperature,
    inputBound: bytes + messages.length * 128 + 512,
  };
}
