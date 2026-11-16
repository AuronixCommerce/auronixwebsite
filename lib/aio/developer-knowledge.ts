import { CREDIT_UNITS, DEVELOPER_MODELS, pricingReady, type ApiPricing } from "@/lib/developers/model";
import type { AioKnowledgeRecord } from "./types";
/** Only public configuration, never an account balance, key or payment record. */
export function developerPricingKnowledge(pricing: ApiPricing): AioKnowledgeRecord {
  const perMillion = (units: number) => ((units * 1000 / CREDIT_UNITS) * pricing.usdCentsPerCredit / 100).toFixed(2);
  return {
    id: "live:aio-developer-pricing",
    title: "Current AIO developer API pricing",
    content: [
      "Current server-published AIO developer API rates. These supersede older launch-price documents. Apply only to metered developer API/playground requests, not ordinary website chat.",
      `API pricing status: ${pricingReady(pricing) ? "enabled (approved developer account, verified email, valid API key and sufficient credits required)" : "paused; new metered requests unavailable"}.`,
      `One credit currently costs USD ${(pricing.usdCentsPerCredit / 100).toFixed(2)}. Minimum top-up is 5 credits.`,
      ...DEVELOPER_MODELS.map(model => `${model.name}: USD ${perMillion(pricing.rates[model.id].input)} per million input tokens; USD ${perMillion(pricing.rates[model.id].output)} per million output tokens.`),
      "Provider-reported token usage determines successful-request charges, including reported reasoning output. A maximum-cost hold is reserved, then unused units are released. Failed requests are not charged. Existing balances and past charges are not multiplied by pricing updates.",
      "Default completion budget: 4096 tokens; maximum: 8192. Explicit caller limits are respected. GPT-OSS 20B/120B use high reasoning effort. All keys and playground calls share the same wallet and spending controls.",
    ].join("\n"),
    summary: "Live public token prices and pricing status, read from the same configuration used by the developer pricing page and metered requests.",
    sourceType: "database", route: "/aio/developers#models", visibility: "public", category: "AIO developer API credits pricing tokens billing", priority: 8,
  };
}
