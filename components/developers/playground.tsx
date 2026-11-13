"use client";
import { useState } from "react";
import Link from "next/link";
import { Copy, Play, Check, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  API_TERMS_VERSION,
  credits,
  DEVELOPER_MODELS,
  pricingReady,
  type ApiPricing,
} from "@/lib/developers/model";
export function DeveloperPlayground({
  account,
  pricing,
  balance,
  onRefresh,
  onUsage,
}: {
  account: any;
  pricing: ApiPricing;
  balance: number;
  onRefresh: () => Promise<void>;
  onUsage: () => void;
}) {
  const [model, setModel] = useState("aio-2-fast"),
    [prompt, setPrompt] = useState(
      "Explain wholesale sourcing in two sentences.",
    ),
    [maxTokens, setMaxTokens] = useState(512),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [ambiguous, setAmbiguous] = useState(false),
    [elapsed, setElapsed] = useState(0);
  const ready =
    account?.status === "approved" &&
    account.termsVersion === API_TERMS_VERSION &&
    pricingReady(pricing) &&
    balance > 0;
  async function test() {
    if (busy || !ready || !prompt.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    setCopied(false);
    const start = performance.now();
    let received = false;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw Error("Sign in to test the API.");
      const r = await fetch("/api/developers/playground", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: maxTokens,
        }),
      });
      const d = await r.json();
      received = true;
      if (!r.ok)
        throw Error(d.error?.message || "The test could not complete.");
      setResult(d);
      setElapsed(Math.round(performance.now() - start));
    } catch (e: any) {
      setError(e.message || "Request failed.");
      if (!received) setAmbiguous(true);
    } finally {
      setBusy(false);
      try {
        await onRefresh();
      } catch {
        setError(
          (e) =>
            e || "Could not refresh your balance. Check Usage before retrying.",
        );
      }
    }
  }
  return (
    <section className="dev-card dev-playground">
      <div className="dev-section-title">
        <div>
          <span className="dev-kicker">LIVE TEXT API TEST</span>
          <h2>Try a prompt. See the exact cost.</h2>
          <p>
            This runs a real, metered AIO text request using your approved
            developer account. It shares your API wallet and request limits.
          </p>
        </div>
        <span className="dev-badge">Non-streaming · v1</span>
      </div>
      {!ready && (
        <div className="dev-alert">
          {account?.status !== "approved"
            ? "Your application must be approved before making live requests."
            : account.termsVersion !== API_TERMS_VERSION
              ? "Accept the current API Terms above to enable testing."
              : !pricingReady(pricing)
                ? "The API is currently paused by the team."
                : "Add prepaid credits in Billing before running a test."}
        </div>
      )}
      <div className="dev-playground-grid">
        <form
          className="dev-form"
          onSubmit={(e) => {
            e.preventDefault();
            void test();
          }}
        >
          <div className="dev-form-grid">
            <label>
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={busy}
              >
                {DEVELOPER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Maximum output tokens
              <select
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                disabled={busy}
              >
                <option value={512}>512</option>
                <option value={1024}>1,024</option>
                <option value={2048}>2,048</option>
              </select>
            </label>
          </div>
          <label>
            Your text prompt
            <textarea
              rows={7}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={4000}
              required
              disabled={busy}
            />
          </label>
          <p className="dev-fine">
            Live tests use your credits at the published model rates. Only
            successful provider-reported usage is charged. A temporary
            maximum-cost hold is released after settlement. No API secret is
            needed in this console.
          </p>
          <button
            className="dev-primary"
            disabled={busy || !ready || ambiguous || !prompt.trim()}
          >
            <Play size={15} />
            {busy ? "Generating…" : "Test text API"}
          </button>
          {busy && (
            <p role="status" className="dev-muted">
              Waiting for the model. Your answer and usage will appear here.
            </p>
          )}
        </form>
        <div className="dev-playground-output" aria-live="polite">
          <div className="dev-section-title">
            <h3>Response</h3>
            {result && (
              <button
                className="dev-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      result.choices[0].message.content,
                    );
                    setCopied(true);
                  } catch {
                    setError("Select the response text to copy it.");
                  }
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          {error && (
            <div className="dev-alert dev-error" role="alert">
              {error}
            </div>
          )}
          {result ? (
            <>
              <div className="dev-preserve dev-response-text">
                {result.choices[0].message.content}
              </div>
              <div className="dev-response-metrics">
                <span>
                  <strong>{result.usage.prompt_tokens}</strong> input tokens
                </span>
                <span>
                  <strong>{result.usage.completion_tokens}</strong> output
                  tokens
                </span>
                <span>
                  <strong>{credits(result.billing.charged_units)}</strong>{" "}
                  credits charged
                </span>
                <span>
                  <strong>{(elapsed / 1000).toFixed(1)}s</strong> response time
                </span>
              </div>
              <p className="dev-fine">
                Request ID: <code>{result.id}</code>
                <br />
                Available credits: {credits(result.billing.available_units)}
              </p>
            </>
          ) : (
            !error && (
              <p className="dev-empty">
                Your model’s actual text response will appear here. This is a
                live API test, not a sample answer.
              </p>
            )
          )}
          {ambiguous && (
            <div className="dev-alert">
              <p>
                The connection ended without a confirmed response. Check Usage
                to see whether the request completed before sending another.
              </p>
              <div className="dev-actions">
                <button className="dev-secondary" onClick={onUsage}>
                  Check usage
                </button>
                <button
                  className="dev-secondary"
                  onClick={() => setAmbiguous(false)}
                >
                  Start a new request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="dev-actions">
        <button className="dev-secondary" onClick={onUsage}>
          View usage ledger <ArrowUpRight size={14} />
        </button>
        <Link className="dev-text-link" href="/aio/developers/terms">
          API Terms &amp; payments
        </Link>
      </div>
    </section>
  );
}
