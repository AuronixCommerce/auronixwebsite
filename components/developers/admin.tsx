"use client";
import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { RefreshCw, Search, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/admin-layout";
import { auth } from "@/lib/firebase";
import {
  CREDIT_UNITS,
  credits,
  DEVELOPER_MODELS,
} from "@/lib/developers/model";
import { developerFetch, UsageTable } from "./console";
const date = (n: number) => new Date(n).toLocaleString();
export function AdminDevelopers() {
  const [data, setData] = useState<any>(null),
    [selected, setSelected] = useState<any>(null),
    [tab, setTab] = useState("accounts"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [invoice, setInvoice] = useState<any>(null);
  async function load() {
    setData(await developerFetch("", undefined, true));
  }
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u) load().catch((e) => setError(e.message));
      }),
    [],
  );
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function open(uid: string, i: any = null) {
    setSelected(await developerFetch("?uid=" + uid, undefined, true));
    setInvoice(i);
    setTab("accounts");
  }
  function savePricing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      rates: any = {};
    for (const m of DEVELOPER_MODELS)
      rates[m.id] = {
        input: Math.round(Number(f.get(m.id + "-input")) * CREDIT_UNITS),
        output: Math.round(Number(f.get(m.id + "-output")) * CREDIT_UNITS),
      };
    void run(async () => {
      setNotice(
        (
          await developerFetch(
            "",
            {
              action: "pricing",
              pricing: {
                enabled: f.get("enabled") === "on",
                usdCentsPerCredit: Math.round(Number(f.get("price")) * 100),
                requestsPerMinute: Number(f.get("rpm")),
                rates,
              },
            },
            true,
          )
        ).message,
      );
      await load();
    });
  }
  return (
    <AdminLayout>
      <div className="dev-admin">
        <div className="dev-section-title">
          <div>
            <span className="dev-kicker">AIO DEVELOPER PLATFORM</span>
            <h1>Access, credits &amp; usage.</h1>
            <p>
              Review API applications, publish prices, and credit verified
              payments.
            </p>
          </div>
          <div className="dev-actions">
            <Link className="dev-secondary" href="/aio/developers">
              Public API page <ArrowUpRight size={15} />
            </Link>
            <button
              className="dev-secondary"
              disabled={busy}
              onClick={() => void run(load)}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {error && (
            <div className="dev-alert dev-error" role="alert">
              {error}
            </div>
          )}
          {notice && <div className="dev-alert">{notice}</div>}
        </div>
        <div className="dev-tabs" role="group" aria-label="API administration">
          <button
            aria-pressed={tab === "accounts"}
            onClick={() => setTab("accounts")}
          >
            Applications &amp; accounts
          </button>
          <button
            aria-pressed={tab === "invoices"}
            onClick={() => setTab("invoices")}
          >
            Invoice requests
          </button>
          <button
            aria-pressed={tab === "pricing"}
            onClick={() => setTab("pricing")}
          >
            API pricing
          </button>
        </div>
        {!data ? (
          <p className="dev-empty">Loading developer operations…</p>
        ) : (
          <>
            {tab === "accounts" && (
              <div className="dev-admin-grid">
                <section className="dev-card">
                  <h2>Developer accounts</h2>
                  <label className="dev-search">
                    <Search size={16} />
                    <input
                      aria-label="Search loaded developer accounts"
                      placeholder="Search loaded accounts"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="dev-account-list">
                    {data.accounts.items
                      .filter((a: any) =>
                        `${a.name} ${a.email} ${a.organization} ${a.status}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((a: any) => (
                        <button
                          className={
                            selected?.account.uid === a.uid ? "selected" : ""
                          }
                          key={a.uid}
                          disabled={busy}
                          onClick={() => void run(() => open(a.uid))}
                        >
                          <strong>{a.organization || a.name}</strong>
                          <span>{a.email}</span>
                          <small>
                            {a.status} · {date(a.createdAt)}
                          </small>
                        </button>
                      ))}
                  </div>
                  {!data.accounts.items.length && (
                    <p className="dev-empty">No applications yet.</p>
                  )}
                  {data.accounts.next && (
                    <button
                      className="dev-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const d = await developerFetch(
                            "?cursor=" + data.accounts.next,
                            undefined,
                            true,
                          );
                          setData((old: any) => ({
                            ...old,
                            accounts: {
                              ...d.accounts,
                              items: [
                                ...old.accounts.items,
                                ...d.accounts.items,
                              ],
                            },
                          }));
                        })
                      }
                    >
                      Load more accounts
                    </button>
                  )}
                </section>
                {!selected ? (
                  <section className="dev-card dev-empty">
                    <h2>Select a developer</h2>
                    <p>
                      Review their use case, approve access, and manage their
                      wallet here.
                    </p>
                  </section>
                ) : (
                  <div>
                    <section className="dev-card">
                      <div className="dev-section-title">
                        <div>
                          <span className="dev-badge">
                            {selected.account.status}
                          </span>
                          <h2>{selected.account.name}</h2>
                          <p>
                            {selected.account.email} ·{" "}
                            {selected.account.organization ||
                              "Independent developer"}
                          </p>
                        </div>
                      </div>
                      <h3>Proposed use case</h3>
                      <p className="dev-preserve">{selected.account.useCase}</p>
                      {selected.account.website && (
                        <a
                          className="dev-text-link"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={selected.account.website}
                        >
                          Developer website <ArrowUpRight size={14} />
                        </a>
                      )}
                      <form
                        className="dev-form"
                        key={selected.account.uid + selected.account.reviewedAt}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void run(async () => {
                            const d = await developerFetch(
                              "",
                              {
                                action: "status",
                                uid: selected.account.uid,
                                status: f.get("status"),
                                note: f.get("note"),
                              },
                              true,
                            );
                            await open(selected.account.uid);
                            await load();
                            setNotice(d.message);
                          });
                        }}
                      >
                        <div className="dev-form-grid">
                          <label>
                            Access decision
                            <select
                              name="status"
                              defaultValue={
                                selected.account.status === "pending"
                                  ? "approved"
                                  : selected.account.status
                              }
                            >
                              <option value="approved">
                                Approve / reactivate
                              </option>
                              <option value="rejected">Reject</option>
                              <option value="suspended">Suspend</option>
                            </select>
                          </label>
                          <label>
                            Review note{" "}
                            <span className="dev-muted">
                              (visible to developer)
                            </span>
                            <textarea
                              name="note"
                              required
                              maxLength={1000}
                              rows={2}
                              defaultValue={selected.account.reviewNote || ""}
                            />
                          </label>
                        </div>
                        <button className="dev-primary" disabled={busy}>
                          Save access decision
                        </button>
                      </form>
                    </section>
                    <section className="dev-card dev-section">
                      <h2>Credit wallet</h2>
                      <div className="dev-wallet-line">
                        <strong>
                          {credits(selected.wallet.balance)}{" "}
                          <small>available credits</small>
                        </strong>
                        <span>
                          {credits(selected.wallet.spent)} used ·{" "}
                          {credits(selected.wallet.reserved)} reserved
                        </span>
                      </div>
                      {invoice && (
                        <div className="dev-alert">
                          <strong>Invoice {invoice.id}</strong>
                          <p>
                            {invoice.credits} credits · $
                            {(invoice.usdCents / 100).toFixed(2)} USD quoted.
                            Check the actual received payment before crediting.
                          </p>
                          <button
                            className="dev-secondary"
                            onClick={() => setInvoice(null)}
                          >
                            Clear invoice selection
                          </button>
                        </div>
                      )}
                      <form
                        className="dev-form"
                        key={selected.account.uid + (invoice?.id || "")}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget),
                            uid = selected.account.uid,
                            form = e.currentTarget;
                          void run(async () => {
                            const d = await developerFetch(
                              "",
                              {
                                action: "credit",
                                uid,
                                credits: Number(f.get("credits")),
                                reference: f.get("reference"),
                                reason: f.get("reason"),
                                paymentVerified: f.get("verified") === "on",
                                invoiceId: invoice?.id || "",
                              },
                              true,
                            );
                            form.reset();
                            await open(uid);
                            await load();
                            setNotice(d.message);
                          });
                        }}
                      >
                        <div className="dev-form-grid">
                          <label>
                            Credits to add
                            <input
                              name="credits"
                              type="number"
                              min={0.000001}
                              max={1000000}
                              step={0.000001}
                              defaultValue={invoice?.credits || ""}
                              readOnly={!!invoice}
                              required
                            />
                          </label>
                          <label>
                            Unique payment / grant reference
                            <input
                              name="reference"
                              maxLength={160}
                              required
                              placeholder="Invoice or payment receipt ID"
                            />
                          </label>
                        </div>
                        <label>
                          Reason / verification record
                          <textarea
                            name="reason"
                            rows={2}
                            required
                            maxLength={1000}
                            placeholder="Record the verified payment, or the authorization for a promotional grant."
                          />
                        </label>
                        <label className="dev-checkbox">
                          <input name="verified" type="checkbox" required />
                          <span>
                            I verified the payment, or have authorized this
                            promotional credit grant. A request alone is not
                            proof of payment.
                          </span>
                        </label>
                        <button
                          className="dev-primary"
                          disabled={
                            busy || selected.account.status !== "approved"
                          }
                        >
                          Record verified credit grant
                        </button>
                      </form>
                      <h3>Recent credit additions</h3>
                      {selected.grants.map((g: any) => (
                        <div className="dev-ledger-row" key={g.id}>
                          <span>
                            {g.reference}
                            <small>
                              {date(g.createdAt)} · {g.reason}
                            </small>
                          </span>
                          <strong>+{credits(g.units)}</strong>
                        </div>
                      ))}
                      {!selected.grants.length && (
                        <p className="dev-muted">No credit grants yet.</p>
                      )}
                    </section>
                    <section className="dev-card dev-section">
                      <h2>Recent usage</h2>
                      <UsageTable rows={selected.usage.items} />
                    </section>
                  </div>
                )}
              </div>
            )}
            {tab === "invoices" && (
              <section className="dev-card">
                <h2>Credit purchase requests</h2>
                <p>
                  Manual invoice billing is active. Card checkout is not
                  connected. Contact the developer to arrange payment, then
                  verify the received amount before granting credits.
                </p>
                <div className="dev-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Developer</th>
                        <th>Requested</th>
                        <th>Credits</th>
                        <th>USD quote</th>
                        <th>Status</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.items.map((i: any) => (
                        <tr key={i.id}>
                          <td>{i.email}</td>
                          <td>{date(i.createdAt)}</td>
                          <td>{i.credits}</td>
                          <td>${(i.usdCents / 100).toFixed(2)}</td>
                          <td>{i.status}</td>
                          <td>
                            <button
                              className="dev-secondary"
                              disabled={busy || i.status === "credited"}
                              onClick={() => void run(() => open(i.uid, i))}
                            >
                              Review payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.invoices.items.length && (
                    <p className="dev-empty">No invoice requests.</p>
                  )}
                </div>
                {data.invoices.next && (
                  <button
                    className="dev-secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const d = await developerFetch(
                          "?view=invoices&cursor=" + data.invoices.next,
                          undefined,
                          true,
                        );
                        setData((old: any) => ({
                          ...old,
                          invoices: {
                            ...d,
                            items: [...old.invoices.items, ...d.items],
                          },
                        }));
                      })
                    }
                  >
                    Load more requests
                  </button>
                )}
              </section>
            )}
            {tab === "pricing" && (
              <section className="dev-card">
                <span className="dev-kicker">PUBLISH BEFORE ENABLING</span>
                <h2>Pricing &amp; request limits</h2>
                <p>
                  Set your selling rates in credits per 1,000 provider tokens.
                  Rates apply to new requests; each request locks the rates used
                  for its credit hold. Existing purchased credits stay in the
                  developer’s wallet when prices change.
                </p>
                <form
                  className="dev-form"
                  key={JSON.stringify(data.pricing)}
                  onSubmit={savePricing}
                >
                  <div className="dev-form-grid">
                    <label>
                      USD price per credit
                      <input
                        name="price"
                        type="number"
                        min={0.01}
                        max={10000}
                        step={0.01}
                        defaultValue={
                          data.pricing.usdCentsPerCredit / 100 || ""
                        }
                        required
                      />
                    </label>
                    <label>
                      Requests / minute / account
                      <input
                        name="rpm"
                        type="number"
                        min={1}
                        max={300}
                        step={1}
                        defaultValue={data.pricing.requestsPerMinute}
                        required
                      />
                    </label>
                  </div>
                  <div className="dev-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>AIO model</th>
                          <th>Input credits / 1K tokens</th>
                          <th>Output credits / 1K tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEVELOPER_MODELS.map((m) => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>
                              <input
                                aria-label={
                                  m.name + " input credits per thousand tokens"
                                }
                                name={m.id + "-input"}
                                type="number"
                                min={0.000001}
                                max={1000}
                                step={0.000001}
                                defaultValue={
                                  data.pricing.rates[m.id].input /
                                    CREDIT_UNITS || ""
                                }
                                required
                              />
                            </td>
                            <td>
                              <input
                                aria-label={
                                  m.name + " output credits per thousand tokens"
                                }
                                name={m.id + "-output"}
                                type="number"
                                min={0.000001}
                                max={1000}
                                step={0.000001}
                                defaultValue={
                                  data.pricing.rates[m.id].output /
                                    CREDIT_UNITS || ""
                                }
                                required
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className="dev-checkbox">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={data.pricing.enabled}
                    />
                    <span>
                      Enable API requests and invoice requests at these rates.
                      The existing Groq provider must be configured.
                    </span>
                  </label>
                  <button className="dev-primary" disabled={busy}>
                    Save API pricing
                  </button>
                </form>
                <div className="dev-alert">
                  Billing amounts and credit grants are controlled by the
                  server. Developers cannot approve their own account, increase
                  their balance, or use API keys to access administrative data.
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
