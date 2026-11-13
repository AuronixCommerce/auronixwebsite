"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  credits,
  CREDIT_UNITS,
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
                  <strong>
                    $
                    {(
                      ((pricing.rates[m.id].input / CREDIT_UNITS) *
                        1000 *
                        pricing.usdCentsPerCredit) /
                      100
                    ).toFixed(2)}
                  </strong>{" "}
                  <small>/ 1M input tokens</small>
                </span>
                <span>
                  <strong>
                    $
                    {(
                      ((pricing.rates[m.id].output / CREDIT_UNITS) *
                        1000 *
                        pricing.usdCentsPerCredit) /
                      100
                    ).toFixed(2)}
                  </strong>{" "}
                  <small>/ 1M output tokens</small>
                </span>
                <small>
                  {credits(pricing.rates[m.id].input)} /{" "}
                  {credits(pricing.rates[m.id].output)} credits per 1K input /
                  output tokens.
                </small>
              </div>
            ) : (
              <span className="dev-badge">
                {error
                  ? "Rates unavailable"
                  : pricing
                    ? "API temporarily paused"
                    : "Loading rates…"}
              </span>
            )}
          </article>
        ))}
      </div>
      <p className="dev-muted">
        {error ||
          (ready
            ? `1 credit = $${(pricing.usdCentsPerCredit / 100).toFixed(2)} USD. Minimum top-up: 5 credits. All keys and playground tests share your prepaid wallet. Payment instructions, transfer reference submission, and admin approval are handled in Billing.`
            : "The team controls availability and prices. Existing balances remain in your wallet during a pause.")}
      </p>
      <Link className="dev-text-link" href="/aio/developers/terms">
        Read API Terms, payments &amp; refund policy
      </Link>
    </>
  );
}
