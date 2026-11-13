"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  ArrowUpRight,
  Copy,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { AuronixMark } from "@/components/site/auronix-mark";
import { CustomerActionSecurity } from "@/components/site/customer-action-security";
import {
  credits,
  DEVELOPER_MODELS,
  pricingReady,
} from "@/lib/developers/model";
import { DeveloperReference } from "./reference";
export async function developerFetch(path: string, body?: any, admin = false) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw Error("Sign in to continue.");
  const r = await fetch(
    admin ? "/api/admin/developers" + path : "/api/developers/" + path,
    {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await r.json();
  if (!r.ok)
    throw Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message || "Please retry.",
    );
  return data;
}
const date = (n: number) => (n ? new Date(n).toLocaleString() : "—");
export function UsageTable({ rows }: { rows: any[] }) {
  return (
    <div className="dev-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Request / date</th>
            <th>Model</th>
            <th>Input / output tokens</th>
            <th>Credits</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <code title={r.requestId || r.id}>
                  {(r.requestId || r.id).slice(0, 14)}…
                </code>
                <small>{date(r.createdAt)}</small>
              </td>
              <td>{r.model}</td>
              <td>
                {r.usage
                  ? `${r.usage.prompt_tokens} / ${r.usage.completion_tokens}`
                  : "—"}
              </td>
              <td>{credits(r.charged)}</td>
              <td>
                <span className="dev-badge">{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="dev-empty">
          Your first request will appear here. Prompts and answers are not
          stored in this ledger.
        </p>
      )}
    </div>
  );
}
export function DeveloperConsole() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [data, setData] = useState<any>(null),
    [tab, setTab] = useState("overview"),
    [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [keys, setKeys] = useState<any[]>([]),
    [keyNext, setKeyNext] = useState(""),
    [secret, setSecret] = useState(""),
    [copied, setCopied] = useState(false),
    [turnstile, setTurnstile] = useState(""),
    [resetKey, setResetKey] = useState(0);
  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    const d = await developerFetch("account");
    if (auth.currentUser?.uid !== uid) return;
    setData(d);
    if (auth.currentUser?.emailVerified && d.account) {
      const k = await developerFetch("keys");
      if (auth.currentUser?.uid !== uid) return;
      setKeys(k.items);
      setKeyNext(k.next);
    }
  }, []);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setData(null);
        setKeys([]);
        setSecret("");
        if (u)
          load()
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
        else setLoading(false);
      }),
    [load],
  );
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  function credentials(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(async () => {
      const email = String(f.get("email")).trim(),
        password = String(f.get("password"));
      if (signup) {
        if (password.length < 10)
          throw Error("Use a password with at least 10 characters.");
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, {
          displayName: String(f.get("name")).trim(),
        });
        const d = await developerFetch("account", { action: "verify-email" });
        setNotice(d.message);
      } else await signInWithEmailAndPassword(auth, email, password);
      await load();
    });
  }
  async function refresh() {
    await auth.currentUser?.reload();
    await auth.currentUser?.getIdToken(true);
    setUser(auth.currentUser);
    await load();
    setNotice("Account refreshed.");
  }
  const approved = data?.account?.status === "approved";
  return (
    <div className="dev-page dev-console">
      <div className="dev-wrap">
        <nav
          className="dev-local-nav"
          aria-label="Developer console navigation"
        >
          <Link className="dev-brand" href="/aio/developers">
            <AuronixMark /> AIO <span>developer console</span>
          </Link>
          <div>
            <Link href="/aio/developers#api-reference">
              Docs <ArrowUpRight size={14} />
            </Link>
            {user && (
              <button
                onClick={() =>
                  void run(async () => {
                    await signOut(auth);
                    setData(null);
                  })
                }
                disabled={busy}
              >
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>
        </nav>
        <div aria-live="polite">
          {error && (
            <div className="dev-alert dev-error" role="alert">
              {error}
            </div>
          )}
          {notice && <div className="dev-alert">{notice}</div>}
        </div>
        {loading ? (
          <p className="dev-empty" role="status">
            Opening your workspace…
          </p>
        ) : !user ? (
          <div className="dev-auth">
            <div>
              <span className="dev-kicker">YOUR BUILDER WORKSPACE</span>
              <h1>
                One account.
                <br />
                <span>Every possibility.</span>
              </h1>
              <p>
                Create your AIO developer account to apply for API access,
                manage keys, and track credits.
              </p>
              <div className="dev-auth-note">
                <ShieldCheck size={22} />
                <span>
                  Access is reviewed by the team. Your account starts with zero
                  credits; no payment is taken at signup.
                </span>
              </div>
              <Link className="dev-text-link" href="/aio/developers">
                Explore the platform <ArrowUpRight size={15} />
              </Link>
            </div>
            <form onSubmit={credentials} className="dev-card dev-form">
              <div
                className="dev-tabs"
                role="group"
                aria-label="Account access"
              >
                <button
                  type="button"
                  aria-pressed={!signup}
                  onClick={() => setSignup(false)}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  aria-pressed={signup}
                  onClick={() => setSignup(true)}
                >
                  Create account
                </button>
              </div>
              <h2>{signup ? "Start building with AIO." : "Welcome back."}</h2>
              {signup && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={signup ? 10 : undefined}
                  required
                />
              </label>
              <button className="dev-primary" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : signup
                    ? "Create developer account"
                    : "Sign in"}
              </button>
              <Link href="/forgot-password" className="dev-text-link">
                Forgot your password?
              </Link>
              <p className="dev-fine">
                By continuing, you agree to the <Link href="/terms">Terms</Link>{" "}
                and <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        ) : (
          <>
            <div className="dev-console-title">
              <div>
                <span className="dev-kicker">WORKSPACE / {user.email}</span>
                <h1>
                  {data?.account?.organization ||
                    data?.account?.name ||
                    "Your developer workspace"}
                </h1>
              </div>
              <button
                className="dev-secondary"
                disabled={busy}
                onClick={() => void run(refresh)}
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
            {!user.emailVerified ? (
              <section className="dev-card dev-form">
                <ShieldCheck size={28} />
                <h2>Verify your email first.</h2>
                <p>
                  We’ll send a verification link to {user.email}. Open it, then
                  refresh this workspace to continue your application.
                </p>
                <div className="dev-actions">
                  <button
                    className="dev-primary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        setNotice(
                          (
                            await developerFetch("account", {
                              action: "verify-email",
                            })
                          ).message,
                        );
                      })
                    }
                  >
                    Send verification email
                  </button>
                  <button
                    className="dev-secondary"
                    disabled={busy}
                    onClick={() => void run(refresh)}
                  >
                    I’ve verified my email
                  </button>
                </div>
              </section>
            ) : !data ? (
              <section className="dev-card">
                <p>We couldn’t load your account.</p>
                <button
                  className="dev-secondary"
                  disabled={busy}
                  onClick={() => void run(load)}
                >
                  Retry
                </button>
              </section>
            ) : !data.account ? (
              <section className="dev-card">
                <span className="dev-kicker">ACCESS APPLICATION</span>
                <h2>Tell us what you’re building.</h2>
                <form
                  className="dev-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(async () => {
                      const d = await developerFetch("account", {
                        action: "apply",
                        name: f.get("name"),
                        organization: f.get("organization"),
                        website: f.get("website"),
                        useCase: f.get("useCase"),
                        accepted: f.get("accepted") === "on",
                        turnstileToken: turnstile,
                      });
                      setNotice(d.message);
                      await load();
                      setResetKey((k) => k + 1);
                    });
                  }}
                >
                  <div className="dev-form-grid">
                    <label>
                      Full name
                      <input
                        name="name"
                        defaultValue={user.displayName || ""}
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </label>
                    <label>
                      Company or project
                      <input name="organization" maxLength={160} />
                    </label>
                  </div>
                  <label>
                    Website <span className="dev-muted">(optional)</span>
                    <input
                      name="website"
                      type="url"
                      placeholder="https://"
                      maxLength={300}
                    />
                  </label>
                  <label>
                    Your use case
                    <textarea
                      name="useCase"
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={4}
                      placeholder="What will your app do, and how will it use AIO?"
                    />
                  </label>
                  <label className="dev-checkbox">
                    <input type="checkbox" name="accepted" required />
                    <span>
                      I agree to the <Link href="/terms">Terms</Link> and API
                      limits, and will keep API keys on my server. I understand
                      that AIO uses an upstream model provider.
                    </span>
                  </label>
                  <CustomerActionSecurity
                    onToken={setTurnstile}
                    resetKey={resetKey}
                  />
                  <button className="dev-primary" disabled={busy}>
                    Submit for review
                  </button>
                </form>
              </section>
            ) : (
              <>
                <div className="dev-status-line">
                  <span className="dev-badge">{data.account.status}</span>
                  <p>
                    {approved
                      ? "API access approved. Your keys share one credit wallet."
                      : data.account.status === "pending"
                        ? "Your application is with the team. Keys become available after approval."
                        : "API access is currently unavailable. Contact support to discuss your account."}
                  </p>
                </div>
                {data.account.reviewNote && (
                  <div className="dev-alert">
                    <strong>Review note:</strong> {data.account.reviewNote}
                  </div>
                )}
                <div
                  className="dev-tabs dev-console-tabs"
                  role="group"
                  aria-label="Workspace sections"
                >
                  {["overview", "keys", "usage", "billing", "docs"].map((t) => (
                    <button
                      key={t}
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t === "keys"
                        ? "API keys"
                        : t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                {tab === "overview" && (
                  <>
                    <div className="dev-stat-grid">
                      <article className="dev-card">
                        <span>Available credits</span>
                        <strong>{credits(data.wallet.balance)}</strong>
                        <small>Ready for your next request</small>
                      </article>
                      <article className="dev-card">
                        <span>Credits used</span>
                        <strong>{credits(data.wallet.spent)}</strong>
                        <small>Successful, metered responses</small>
                      </article>
                      <article className="dev-card">
                        <span>Credits reserved</span>
                        <strong>{credits(data.wallet.reserved)}</strong>
                        <small>Temporarily held for active requests</small>
                      </article>
                    </div>
                    <section className="dev-card dev-section">
                      <h2>Your next steps</h2>
                      <div className="dev-steps">
                        {[
                          [
                            "1",
                            "Approval",
                            approved
                              ? "Your developer access is active."
                              : "Wait for the team to review your use case.",
                          ],
                          [
                            "2",
                            "Credits",
                            "Request an invoice in Billing. Verified payments fund your wallet.",
                          ],
                          [
                            "3",
                            "API key",
                            "Create a named key for each server or project.",
                          ],
                          [
                            "4",
                            "First call",
                            "Use the API reference to make a text-generation request.",
                          ],
                        ].map(([n, h, p]) => (
                          <article key={n}>
                            <span>{n}</span>
                            <h3>{h}</h3>
                            <p>{p}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="dev-section">
                      <h2>Recent usage</h2>
                      <UsageTable rows={data.usage.items} />
                    </section>
                  </>
                )}
                {tab === "keys" && (
                  <section className="dev-card">
                    <div className="dev-section-title">
                      <div>
                        <h2>Your API keys</h2>
                        <p>
                          Create as many project keys as you need. They share
                          your wallet and account limits.
                        </p>
                      </div>
                      <KeyRound size={24} />
                    </div>
                    {secret && (
                      <div className="dev-secret">
                        <strong>
                          Copy your secret now — it is shown only once.
                        </strong>
                        <code>{secret}</code>
                        <div className="dev-actions">
                          <button
                            className="dev-secondary"
                            onClick={() =>
                              void run(async () => {
                                await navigator.clipboard.writeText(secret);
                                setCopied(true);
                              })
                            }
                          >
                            <Copy size={14} />{" "}
                            {copied ? "Copied" : "Copy secret"}
                          </button>
                          <button
                            className="dev-secondary"
                            onClick={() => {
                              setSecret("");
                              setCopied(false);
                            }}
                          >
                            I saved it · Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                    <form
                      className="dev-key-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget),
                          form = e.currentTarget;
                        void run(async () => {
                          const d = await developerFetch("keys", {
                            action: "create",
                            name: f.get("name"),
                          });
                          setSecret(d.secret);
                          setCopied(false);
                          form.reset();
                          await load();
                        });
                      }}
                    >
                      <label>
                        Key name
                        <input
                          name="name"
                          required
                          maxLength={80}
                          placeholder="Production server"
                          disabled={!approved}
                        />
                      </label>
                      <button
                        className="dev-primary"
                        disabled={busy || !approved}
                      >
                        <Plus size={16} /> Create key
                      </button>
                    </form>
                    <div className="dev-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Prefix</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((k) => (
                            <tr key={k.id}>
                              <td>{k.name}</td>
                              <td>
                                <code>{k.prefix}</code>
                              </td>
                              <td>{date(k.createdAt)}</td>
                              <td>{k.status}</td>
                              <td>
                                {k.status === "active" && (
                                  <button
                                    className="dev-danger"
                                    disabled={busy}
                                    onClick={() =>
                                      void run(async () => {
                                        await developerFetch("keys", {
                                          action: "revoke",
                                          id: k.id,
                                        });
                                        setNotice("Key revoked.");
                                        await load();
                                      })
                                    }
                                  >
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!keys.length && (
                        <p className="dev-empty">No API keys yet.</p>
                      )}
                    </div>
                    {keyNext && (
                      <button
                        className="dev-secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const d = await developerFetch(
                              "keys?cursor=" + keyNext,
                            );
                            setKeys((k) => [...k, ...d.items]);
                            setKeyNext(d.next);
                          })
                        }
                      >
                        Load more keys
                      </button>
                    )}
                    <p className="dev-fine">
                      Never put a secret in frontend code, public repositories,
                      or chat. Revoke immediately if exposed. Key creation is
                      limited to 20 actions per minute, with no lifetime key
                      limit.
                    </p>
                  </section>
                )}
                {tab === "usage" && (
                  <section className="dev-card">
                    <h2>Usage ledger</h2>
                    <p className="dev-muted">
                      Each row shows a request’s model, provider-reported
                      tokens, and credit charge. Failed or expired requests are
                      not charged.
                    </p>
                    <UsageTable rows={data.usage.items} />
                    {data.usage.next && (
                      <button
                        className="dev-secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const d = await developerFetch(
                              "account?view=usage&cursor=" + data.usage.next,
                            );
                            setData((old: any) => ({
                              ...old,
                              usage: {
                                ...d,
                                items: [...old.usage.items, ...d.items],
                              },
                            }));
                          })
                        }
                      >
                        Load more usage
                      </button>
                    )}
                  </section>
                )}
                {tab === "billing" && (
                  <>
                    <div className="dev-stat-grid">
                      <article className="dev-card">
                        <span>Available balance</span>
                        <strong>{credits(data.wallet.balance)}</strong>
                        <small>credits</small>
                      </article>
                      <article className="dev-card">
                        <span>Credit price</span>
                        <strong>
                          {data.pricing.usdCentsPerCredit
                            ? "$" +
                              (data.pricing.usdCentsPerCredit / 100).toFixed(2)
                            : "Unpublished"}
                        </strong>
                        <small>USD per credit</small>
                      </article>
                      <article className="dev-card">
                        <span>Account request limit</span>
                        <strong>{data.pricing.requestsPerMinute}</strong>
                        <small>requests / minute, across all keys</small>
                      </article>
                    </div>
                    <section className="dev-card dev-section">
                      <h2>Add prepaid credits</h2>
                      <p>
                        Request an invoice. The Auronix team will arrange
                        payment and verify it before adding credits. Online card
                        checkout is not connected. No payment is taken by this
                        form.
                      </p>
                      <form
                        className="dev-key-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void run(async () => {
                            setNotice(
                              (
                                await developerFetch("account", {
                                  action: "invoice",
                                  credits: Number(f.get("credits")),
                                })
                              ).message,
                            );
                            await load();
                          });
                        }}
                      >
                        <label>
                          Credits to purchase
                          <input
                            name="credits"
                            type="number"
                            min={1}
                            max={100000}
                            step={1}
                            defaultValue={10}
                            required
                          />
                        </label>
                        <button
                          className="dev-primary"
                          disabled={
                            busy || !approved || !pricingReady(data.pricing)
                          }
                        >
                          Request invoice
                        </button>
                      </form>
                      {!pricingReady(data.pricing) && (
                        <p className="dev-fine">
                          Credit purchases and API requests are paused until
                          pricing is published and the API is enabled.
                        </p>
                      )}
                      <div className="dev-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Requested</th>
                              <th>Credits</th>
                              <th>Amount (USD)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.invoices.items.map((i: any) => (
                              <tr key={i.id}>
                                <td>{date(i.createdAt)}</td>
                                <td>{i.credits}</td>
                                <td>${(i.usdCents / 100).toFixed(2)}</td>
                                <td>{i.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!data.invoices.items.length && (
                          <p className="dev-empty">No invoices requested.</p>
                        )}
                      </div>
                      {data.invoices.next && (
                        <button
                          className="dev-secondary"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const d = await developerFetch(
                                "account?view=invoices&cursor=" +
                                  data.invoices.next,
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
                          Load more invoices
                        </button>
                      )}
                    </section>
                    <section className="dev-card dev-section">
                      <h2>Published model rates</h2>
                      <div className="dev-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Model</th>
                              <th>Credits / 1K input tokens</th>
                              <th>Credits / 1K output tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {DEVELOPER_MODELS.map((m) => (
                              <tr key={m.id}>
                                <td>{m.name}</td>
                                <td>
                                  {data.pricing.rates[m.id].input
                                    ? credits(data.pricing.rates[m.id].input)
                                    : "Unpublished"}
                                </td>
                                <td>
                                  {data.pricing.rates[m.id].output
                                    ? credits(data.pricing.rates[m.id].output)
                                    : "Unpublished"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <h3>Recent credit additions</h3>
                      {data.grants.length ? (
                        data.grants.map((g: any) => (
                          <p className="dev-ledger-row" key={g.id}>
                            <span>
                              {date(g.createdAt)} · {g.reference}
                            </span>
                            <strong>+{credits(g.units)} credits</strong>
                          </p>
                        ))
                      ) : (
                        <p className="dev-muted">
                          Verified top-ups will appear here.
                        </p>
                      )}
                    </section>
                  </>
                )}
                {tab === "docs" && <DeveloperReference />}
              </>
            )}
          </>
        )}
        <div className="dev-console-footer">
          <Link href="/support/contact">
            Need help with your API account? <ArrowUpRight size={14} />
          </Link>
          <span>AIO API · Auronix Commerce LLC</span>
        </div>
      </div>
    </div>
  );
}
