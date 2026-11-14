"use client";
import { useEffect, useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { developerFetch } from "./client";
import { credits } from "@/lib/developers/model";
const units = (v: FormDataEntryValue | null) =>
  String(v || "").trim() === "" ? null : Math.round(Number(v) * 1_000_000);
export function DeveloperIntegrations() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [secret, setSecret] = useState(""),
    [copied, setCopied] = useState(false);
  async function load() {
    setData(await developerFetch("integrations"));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function run(body: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await developerFetch("integrations", body);
      if (d.secret) {
        setSecret(d.secret);
        setCopied(false);
      }
      setNotice(d.message);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {error && (
        <div className="dev-alert dev-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="dev-alert" role="status">
          {notice}
        </div>
      )}
      {!data ? (
        <p className="dev-empty">Loading controls and integrations…</p>
      ) : (
        <>
          <section className="dev-card">
            <span className="dev-kicker">ACCOUNT-WIDE CONTROLS</span>
            <h2>Set your spending boundaries.</h2>
            <p>
              Limits apply to every API key and live playground request. Active
              maximum-cost holds count toward limits. Daily and monthly periods
              reset in UTC, based on when each request starts.
            </p>
            <div className="dev-stat-grid">
              <div className="dev-card">
                <span>Spent today (UTC)</span>
                <strong>{credits(data.wallet.dailySpent)}</strong>
                <small>
                  credits · {credits(data.wallet.dailyReserved)} reserved
                </small>
              </div>
              <div className="dev-card">
                <span>Spent this month (UTC)</span>
                <strong>{credits(data.wallet.monthlySpent)}</strong>
                <small>
                  credits · {credits(data.wallet.monthlyReserved)} reserved
                </small>
              </div>
              <div className="dev-card">
                <span>Available wallet</span>
                <strong>{credits(data.wallet.balance)}</strong>
                <small>credits</small>
              </div>
            </div>
            <form
              className="dev-form dev-section"
              key={JSON.stringify(data.wallet.controls)}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run({
                  action: "spending",
                  controls: {
                    dailyUnits: units(f.get("daily")),
                    monthlyUnits: units(f.get("monthly")),
                    lowBalanceUnits: units(f.get("threshold")) ?? 0,
                    emailAlerts: f.get("alerts") === "on",
                  },
                });
              }}
            >
              <div className="dev-form-grid">
                <label>
                  Daily credit limit
                  <input
                    name="daily"
                    type="number"
                    min={0}
                    max={1000000}
                    step={0.000001}
                    defaultValue={
                      data.wallet.controls.dailyUnits === null
                        ? ""
                        : data.wallet.controls.dailyUnits / 1_000_000
                    }
                    placeholder="No daily limit"
                  />
                </label>
                <label>
                  Monthly credit limit
                  <input
                    name="monthly"
                    type="number"
                    min={0}
                    max={1000000}
                    step={0.000001}
                    defaultValue={
                      data.wallet.controls.monthlyUnits === null
                        ? ""
                        : data.wallet.controls.monthlyUnits / 1_000_000
                    }
                    placeholder="No monthly limit"
                  />
                </label>
              </div>
              <label>
                Low-balance threshold (credits)
                <input
                  name="threshold"
                  type="number"
                  min={0}
                  max={1000000}
                  step={0.000001}
                  defaultValue={
                    data.wallet.controls.lowBalanceUnits / 1_000_000
                  }
                  required
                />
              </label>
              <label className="dev-checkbox">
                <input
                  name="alerts"
                  type="checkbox"
                  defaultChecked={data.wallet.controls.emailAlerts}
                />
                <span>
                  Email my verified account address when my actual balance
                  reaches this threshold. Temporary credit holds alone do not
                  trigger alerts.
                </span>
              </label>
              <p className="dev-fine">
                Leave a limit blank for no limit. A zero daily or monthly limit
                pauses new paid requests. Low-balance notices re-arm after a
                top-up takes the balance above the threshold.
              </p>
              <button className="dev-primary" disabled={busy}>
                Save spending controls
              </button>
            </form>
          </section>
          <section className="dev-card dev-section">
            <div className="dev-section-title">
              <div>
                <span className="dev-kicker">SIGNED DEVELOPER WEBHOOKS</span>
                <h2>Keep your app informed.</h2>
              </div>
              <span className="dev-badge">One endpoint per account</span>
            </div>
            <p>
              Receive payment approvals and low-balance events at your public
              HTTPS endpoint. Deliveries are signed and may be repeated; verify
              the signature and deduplicate event IDs before handling them.
            </p>
            {secret && (
              <div className="dev-secret">
                <strong>
                  Save this signing secret now. It will not be shown again.
                </strong>
                <code>{secret}</code>
                <div className="dev-actions">
                  <button
                    className="dev-secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(secret);
                        setCopied(true);
                      } catch {
                        setError("Select and copy the signing secret.");
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                    {copied ? "Copied" : "Copy secret"}
                  </button>
                  <button
                    className="dev-secondary"
                    onClick={() => setSecret("")}
                  >
                    I saved it
                  </button>
                </div>
              </div>
            )}
            <form
              className="dev-form"
              key={data.webhook.version}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run({
                  action: "webhook",
                  url: f.get("url"),
                  events: f.getAll("event"),
                  enabled: f.get("enabled") === "on",
                });
              }}
            >
              <label>
                Public HTTPS endpoint
                <input
                  name="url"
                  type="url"
                  required
                  maxLength={2048}
                  defaultValue={data.webhook.url}
                  placeholder="https://your-domain.com/aio-webhook"
                />
              </label>
              <div className="dev-key-models">
                {[
                  ["payment.approved", "Payment approved"],
                  ["balance.low", "Low balance"],
                ].map(([value, label]) => (
                  <label key={value} className="dev-checkbox">
                    <input
                      type="checkbox"
                      name="event"
                      value={value}
                      defaultChecked={data.webhook.events?.includes(value)}
                    />
                    <span>
                      {label} <code>{value}</code>
                    </span>
                  </label>
                ))}
              </div>
              <label className="dev-checkbox">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={data.webhook.enabled}
                />
                <span>Enable delivery of selected events.</span>
              </label>
              <button className="dev-primary" disabled={busy}>
                Save webhook endpoint
              </button>
            </form>
            {data.webhook.version > 0 && (
              <div className="dev-actions">
                <button
                  className="dev-secondary"
                  disabled={busy || !data.webhook.enabled}
                  onClick={() => void run({ action: "test-webhook" })}
                >
                  Send test event
                </button>
                <button
                  className="dev-secondary"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      action: "webhook",
                      ...data.webhook,
                      rotate: true,
                    })
                  }
                >
                  Rotate signing secret
                </button>
                <span className="dev-fine">
                  Current secret: {data.webhook.secretPrefix}
                </span>
              </div>
            )}
            <details className="dev-webhook-docs">
              <summary>Signature verification and delivery behavior</summary>
              <p>
                Verify <code>AIO-Webhook-Signature</code> as{" "}
                <code>v1=HMAC-SHA256(secret, timestamp + "." + rawBody)</code>,
                using the complete signing secret and the exact raw request
                body. The timestamp is in <code>AIO-Webhook-Timestamp</code>;
                reject timestamps outside five minutes. Match{" "}
                <code>AIO-Webhook-Id</code> to the body’s <code>id</code>, then
                persist the ID to handle repeated deliveries once. Acknowledge
                only after durable acceptance.
              </p>
              <p>
                Changing or rotating the endpoint cancels pending deliveries
                from the old configuration. Retry explicitly to send an old
                event to the current endpoint. Delivery is attempted
                immediately; failed jobs have backoff and are retried during
                later API activity, manual retries, or the maintenance worker.
                Maintenance is a daily backstop; no fixed retry-time guarantee
                is made.
              </p>
              <p>
                Private/local addresses, IP-literal URLs, redirects, and
                non-HTTPS endpoints are rejected. Node.js and Python download
                examples include matching signature verification.
              </p>
            </details>
          </section>
          <section className="dev-card dev-section">
            <div className="dev-section-title">
              <h2>Delivery history</h2>
              <button
                className="dev-secondary"
                disabled={busy}
                onClick={() => void load().catch((e) => setError(e.message))}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="dev-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Email</th>
                    <th>Webhook</th>
                    <th>Attempts</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deliveries.items.map((d: any) => (
                    <tr key={d.id}>
                      <td>
                        {d.type}
                        <small title={d.id}>{d.id.slice(0, 16)}…</small>
                      </td>
                      <td>{new Date(d.createdAt).toLocaleString()}</td>
                      <td>{d.email.state}</td>
                      <td>
                        {d.webhook.state}
                        {d.webhook.statusCode ? (
                          <small>HTTP {d.webhook.statusCode}</small>
                        ) : null}
                      </td>
                      <td>{d.webhook.attempts}</td>
                      <td>
                        <button
                          className="dev-secondary"
                          disabled={busy || !data.webhook.enabled}
                          onClick={() =>
                            void run({ action: "retry-event", id: d.id })
                          }
                        >
                          Retry current endpoint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.deliveries.items.length && (
                <p className="dev-empty">
                  Events and their delivery status will appear here.
                </p>
              )}
            </div>
            <p className="dev-fine">
              Email “accepted” means accepted by the mail service or retry
              queue, not confirmed inbox delivery. The most recent 50 events are
              shown.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
