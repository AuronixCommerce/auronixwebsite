"use client";
import { useEffect, useState } from "react";
import {
  credits,
  DEVELOPER_MODELS,
  pricingReady,
  type ApiPricing,
} from "@/lib/developers/model";
export function DeveloperPricing() {
  const [pricing, setPricing] = useState<ApiPricing | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/developers/pricing", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        setPricing((await r.json()).pricing);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "Pricing is temporarily unavailable. Check your console or contact support.",
          );
      });
    return () => controller.abort();
  }, []);
  const ready = pricing && pricingReady(pricing);
  return (
    <>
      <div className="dev-model-grid">
        {DEVELOPER_MODELS.map((m, i) => (
          <article className="dev-card" key={m.id}>
            <span className="dev-mono">
              0{i + 1} / {m.id}
            </span>
            <h3>{m.name}</h3>
            <p>{m.description}</p>
            {ready ? (
              <div className="dev-rate">
                <span>
                  {credits(pricing.rates[m.id].input)} credits{" "}
                  <small>/ 1K input tokens</small>
                </span>
                <span>
                  {credits(pricing.rates[m.id].output)} credits{" "}
                  <small>/ 1K output tokens</small>
                </span>
              </div>
            ) : (
              <span className="dev-badge">
                {error
                  ? "Rates unavailable"
                  : pricing
                    ? "Rates awaiting publication"
                    : "Loading rates…"}
              </span>
            )}
          </article>
        ))}
      </div>
      <p className="dev-muted">
        {error ||
          (ready
            ? `1 credit = $${(pricing.usdCentsPerCredit / 100).toFixed(2)} USD. Prepaid credits, shared across your keys. Invoice payments are verified by the team before credits are added.`
            : "Applications can be reviewed before launch. API requests and credit purchases remain paused until the team publishes pricing.")}
      </p>
    </>
  );
}
