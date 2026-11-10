"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Mail,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  CUSTOMER_ACTIONS,
  CUSTOMER_ACTION_KINDS,
  customerActionSteps,
  type CustomerActionKind,
  type CustomerField,
} from "@/lib/aio/customer-actions";
import { normalizeVerificationCode } from "@/lib/aio/verification-code";
import { auth } from "@/lib/firebase";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/design/primitives";
import { AuronixMark } from "./auronix-mark";
import { CustomerActionSecurity } from "./customer-action-security";
export type CustomerActionSelection = {
  kind: CustomerActionKind | null;
  seed?: Record<string, string>;
  key: string;
};
export function CustomerActionPanel({
  selection,
  conversationId,
  saveHistory,
  onClose,
  onReceipt,
}: {
  selection: CustomerActionSelection;
  conversationId: string;
  saveHistory: boolean;
  onClose: () => void;
  onReceipt: (result: any) => void;
}) {
  const [kind, setKind] = useState<CustomerActionKind | null>(selection.kind),
    [step, setStep] = useState(0),
    [input, setInput] = useState<Record<string, any>>({
      frequency: "weekly",
      preferredContact: "business",
      emailType: "business",
      company: true,
      sourcing: true,
      sellers: true,
      suppliers: true,
      ...selection.seed,
    }),
    [defaults, setDefaults] = useState<Record<string, string>>({}),
    [phase, setPhase] = useState("form"),
    [flow, setFlow] = useState<any>(null),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [signedIn, setSignedIn] = useState(!!auth.currentUser),
    [available, setAvailable] = useState<CustomerActionKind[]>(
      CUSTOMER_ACTION_KINDS,
    ),
    [query, setQuery] = useState(""),
    [token, setToken] = useState(""),
    [resetKey, setResetKey] = useState(0),
    [now, setNow] = useState(Date.now());
  const panelScroll = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<Record<string, File>>({}),
    requestKey = useRef(crypto.randomUUID()),
    alive = useRef(true),
    controller = useRef<AbortController>(),
    receiptSent = useRef(false);
  const needsSecurity = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    securityReady = !needsSecurity || !!token;
  async function api(body: any, multipart?: FormData) {
    const sessionToken = await auth.currentUser?.getIdToken();
    const abort = new AbortController();
    controller.current = abort;
    try {
      if (multipart) {
        for (const [k, v] of Object.entries({ ...body, turnstileToken: token }))
          multipart.set(k, String(v));
      }
      const response = await fetch("/api/aio/customer-actions", {
        method: "POST",
        headers: {
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          ...(!multipart ? { "Content-Type": "application/json" } : {}),
        },
        body: multipart || JSON.stringify({ ...body, turnstileToken: token }),
        signal: abort.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "We could not complete this action.");
      return data;
    } finally {
      if (alive.current) {
        setToken("");
        setResetKey((v) => v + 1);
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    let first = true,
      lastUid = auth.currentUser?.uid || "";
    const stop = onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      const uid = user?.uid || "";
      if (!first && uid !== lastUid) {
        controller.current?.abort();
        onClose();
      }
      first = false;
      lastUid = uid;
    });
    async function load() {
      try {
        const jwt = await auth.currentUser?.getIdToken();
        const r = await fetch("/api/aio/customer-actions", {
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          cache: "no-store",
        });
        const d = await r.json();
        if (r.ok && alive.current) {
          setSignedIn(d.signedIn);
          setAvailable(d.actions.map((a: any) => a.id));
          setDefaults(d.defaults || {});
          setInput((v) => ({ ...d.defaults, ...v }));
        }
      } catch {}
    }
    void load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive.current = false;
      controller.current?.abort();
      stop();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    panelScroll.current?.scrollTo({ top: 0 });
  }, [step, phase, kind]);
  function choose(next: CustomerActionKind) {
    setKind(next);
    setStep(0);
    setPhase("form");
    setFlow(null);
    setCode("");
    setError("");
    setInput({
      frequency: "weekly",
      preferredContact: "business",
      emailType: "business",
      company: true,
      sourcing: true,
      sellers: true,
      suppliers: true,
      ...defaults,
    });
    fileRefs.current = {};
    requestKey.current = crypto.randomUUID();
    receiptSent.current = false;
  }
  async function run(mode: string) {
    if (busy || !kind || !securityReady) return;
    const actorUid=auth.currentUser?.uid || "";
    setBusy(true);
    setError("");
    try {
      let data: any;
      if (mode === "prepare")
        data = await api({
          mode,
          kind,
          input,
          requestKey: requestKey.current,
          conversationId,
          saveHistory,
        });
      else if (mode === "inspect")
        data = await api({ mode, kind, conversationId, saveHistory });
      else {
        let files: FormData | undefined;
        if (mode === "confirm" && kind === "supplier_apply") {
          files = new FormData();
          for (const [name, file] of Object.entries(fileRefs.current))
            files.set(name, file);
        }
        data = await api(
          {
            mode,
            id: flow.id,
            token: flow.token,
            code:
              mode === "verify" ? normalizeVerificationCode(code) : undefined,
            confirmed: mode === "confirm",
          },
          files,
        );
      }
      if (!alive.current) return;
      if((auth.currentUser?.uid || "")!==actorUid){onClose();return;}
      if (mode === "inspect") {
        setFlow({ result: data.result });
        setPhase("complete");
        onReceipt(data.result);
      } else {
        setFlow((old: any) => ({
          ...old,
          ...data,
          token: data.token || old?.token,
        }));
        setPhase(data.phase || "verify");
        if (data.phase === "review") setCode("");
        if (data.phase === "complete" && !receiptSent.current) {
          receiptSent.current = true;
          onReceipt(data.result);
        }
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Unable to complete this action.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function advance(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    const steps = customerActionSteps(kind);
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    void run("prepare");
  }
  async function close() {
    if (busy) return;
    if (flow?.id && flow.phase !== "complete" && securityReady) {
      void api({ mode: "cancel", id: flow.id, token: flow.token }).catch(
        () => undefined,
      );
    }
    onClose();
  }
  const action = kind ? CUSTOMER_ACTIONS[kind] : null,
    steps = kind ? customerActionSteps(kind) : [],
    fields = steps[step]?.fields || [],
    accountBlocked = action?.account && !signedIn,
    resendSeconds = Math.max(
      0,
      Math.ceil(((flow?.resendAt || 0) - now) / 1000),
    );
  const update = (key: string, value: any) =>
    setInput((prev) => ({ ...prev, [key]: value }));
  function fieldControl(f: CustomerField) {
    const id = `aio-action-${f.key}`;
    if (f.type === "checkbox")
      return (
        <label className="aio-action-checkbox" key={f.key}>
          <input
            id={id}
            type="checkbox"
            checked={input[f.key] === true}
            onChange={(e) => update(f.key, e.target.checked)}
            required={f.required}
          />
          <span>
            {f.label}
            {f.help?.startsWith("/") ? (
              <Link href={f.help} target="_blank" rel="noopener noreferrer">
                Read policy ↗
              </Link>
            ) : f.help ? (
              <small>{f.help}</small>
            ) : null}
          </span>
        </label>
      );
    return (
      <label
        className={
          f.type === "textarea"
            ? "aio-action-field is-wide"
            : "aio-action-field"
        }
        key={f.key}
        htmlFor={id}
      >
        <span>
          {f.label}
          {!f.required && <small>Optional</small>}
        </span>
        {f.type === "select" ? (
          <select
            id={id}
            required={f.required}
            value={input[f.key] || ""}
            onChange={(e) => update(f.key, e.target.value)}
          >
            <option value="">Choose…</option>
            {f.options?.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : f.type === "textarea" ? (
          <textarea
            id={id}
            required={f.required}
            minLength={f.minLength}
            maxLength={f.maxLength || 5000}
            value={input[f.key] || ""}
            onChange={(e) => update(f.key, e.target.value)}
            rows={4}
          />
        ) : (
          <input
            id={id}
            type={f.type || "text"}
            required={f.required}
            minLength={f.minLength}
            maxLength={f.maxLength || 500}
            min={f.type === "number" ? 0 : undefined}
            value={input[f.key] || ""}
            onChange={(e) => update(f.key, e.target.value)}
            autoComplete={
              f.type === "email" ? "email" : f.type === "tel" ? "tel" : "off"
            }
          />
        )}
      </label>
    );
  }
  return (
    <section className="aio-customer-panel" aria-label="AIO customer actions">
      <header className="aio-action-heading">
        <div>
          <AuronixMark />
          <span>
            <strong>{action?.title || "What would you like to do?"}</strong>
            <small>Handle it here, with AIO</small>
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close customer actions"
        >
          <X size={18} />
        </button>
      </header>
      {!kind ? (
        <div ref={panelScroll} className="aio-action-scroll">
          <p className="aio-action-lead">
            Applications, emails, and your account. Choose a task and we’ll
            guide you through it.
          </p>
          <label className="aio-action-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an action…"
              aria-label="Search customer actions"
            />
          </label>
          {!available.length && (
            <p>
              Customer actions are currently disabled. You can still use the
              dedicated pages.
            </p>
          )}
          {Array.from(
            new Set(
              CUSTOMER_ACTION_KINDS.map((k) => CUSTOMER_ACTIONS[k].group),
            ),
          ).map((group) => (
            <section key={group} className="aio-action-group">
              <h3>{group}</h3>
              <div>
                {CUSTOMER_ACTION_KINDS.filter(
                  (k) =>
                    available.includes(k) &&
                    CUSTOMER_ACTIONS[k].group === group &&
                    `${CUSTOMER_ACTIONS[k].title} ${CUSTOMER_ACTIONS[k].description}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ).map((k) => (
                  <button type="button" key={k} onClick={() => choose(k)}>
                    <span>
                      <strong>{CUSTOMER_ACTIONS[k].title}</strong>
                      <small>{CUSTOMER_ACTIONS[k].description}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          {action?.mode === "write" ? (
            <div className="aio-action-progress" aria-label="Action progress">
              <span className={phase === "form" ? "is-current" : "is-done"}>
                1 Details
              </span>
              <i />
              <span
                className={
                  phase === "verify"
                    ? "is-current"
                    : ["review", "complete"].includes(phase)
                      ? "is-done"
                      : ""
                }
              >
                2 Verify email
              </span>
              <i />
              <span
                className={
                  phase === "review"
                    ? "is-current"
                    : phase === "complete"
                      ? "is-done"
                      : ""
                }
              >
                3 Review
              </span>
            </div>
          ) : (
            <div className="aio-action-progress">
              <ShieldCheck size={14} />
              Your signed-in account · Private lookup
            </div>
          )}
          <form
            className="aio-action-form"
            onSubmit={
              phase === "form"
                ? advance
                : (e) => {
                    e.preventDefault();
                    void run(phase === "verify" ? "verify" : "confirm");
                  }
            }
          >
            <div ref={panelScroll} className="aio-action-scroll">
              {accountBlocked ? (
                <div className="aio-action-signin">
                  <ShieldCheck size={28} />
                  <h3>Sign in to your account</h3>
                  <p>
                    This action uses your own account records and verified
                    account email.
                  </p>
                  <Link href="/seller/login" className="ac-button">
                    Sign in
                  </Link>
                </div>
              ) : phase === "form" ? (
                <>
                  <p className="aio-action-lead">{action?.description}</p>
                  {action?.mode === "read" ? (
                    <p>
                      Your account permissions are checked before any records
                      are shown.
                    </p>
                  ) : (
                    <>
                      <div className="aio-action-step-label">
                        <span>
                          Step {step + 1} of {steps.length}
                        </span>
                        <h3>{steps[step]?.title}</h3>
                      </div>
                      <div className="aio-action-fields">
                        {fields.map(fieldControl)}
                      </div>
                      {kind === "supplier_apply" && step === 1 && (
                        <div className="aio-action-uploads">
                          {[
                            ["catalogFile", "Catalog document"],
                            ["authorizationFile", "Brand authorization"],
                          ].map(([key, label]) => (
                            <label key={key}>
                              <Upload size={15} />
                              <span>
                                {label}
                                <small>
                                  Optional · PDF, images, spreadsheets · 12 MB
                                  max
                                </small>
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 12 * 1024 * 1024) {
                                      setError(
                                        "Each document must be 12 MB or smaller.",
                                      );
                                      e.target.value = "";
                                      return;
                                    }
                                    fileRefs.current[key] = file;
                                  } else delete fileRefs.current[key];
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="aio-action-note">
                        <Mail size={14} />
                        We’ll send a code before you review and confirm. No
                        application or account change is submitted yet.
                      </p>
                    </>
                  )}
                </>
              ) : phase === "verify" ? (
                <div className="aio-action-verify">
                  <span className="aio-action-verify-icon">
                    <Mail size={24} />
                  </span>
                  <h3>Check your email</h3>
                  <p>
                    Enter the six-digit code sent to{" "}
                    <strong>{flow.emailMasked}</strong>.
                  </p>
                  {flow.emailStatus === "queued" && (
                    <p className="aio-action-notice">
                      Your verification email is queued. Delivery will retry
                      automatically.
                    </p>
                  )}
                  {flow.emailStatus === "failed" && (
                    <p className="aio-action-notice">
                      The email could not be sent. Wait and request a fresh
                      code.
                    </p>
                  )}
                  <InputOTP
                    maxLength={6}
                        pasteTransformer={normalizeVerificationCode}
                        autoFocus
                    value={code}
                    onChange={(v) => setCode(normalizeVerificationCode(v))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="Email verification code"
                    containerClassName="aio-action-otp"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="aio-action-note">
                    Codes expire after 10 minutes. Enter codes here, never as a
                    chat message.
                  </p>
                  <button
                    className="aio-action-text-button"
                    type="button"
                    disabled={busy || resendSeconds > 0 || !securityReady}
                    onClick={() => run("resend")}
                  >
                    {resendSeconds
                      ? `Resend available in ${resendSeconds}s`
                      : "Send a new code"}
                  </button>
                </div>
              ) : phase === "review" ? (
                <>
                  <p className="aio-action-verified">
                    <ShieldCheck size={16} />
                    Email verified
                  </p>
                  <h3 className="aio-action-review-title">
                    Review before confirming
                  </h3>
                  <p>{action?.description}</p>
                  <dl className="aio-action-review">
                    {customerActionSteps(kind)
                      .flatMap((s) => s.fields)
                      .filter(
                        (f) =>
                          flow.review?.[f.key] !== "" &&
                          flow.review?.[f.key] !== undefined,
                      )
                      .map((f) => (
                        <div key={f.key}>
                          <dt>{f.label}</dt>
                          <dd>
                            {typeof flow.review[f.key] === "boolean"
                              ? flow.review[f.key]
                                ? "Yes"
                                : "No"
                              : String(flow.review[f.key])}
                          </dd>
                        </div>
                      ))}
                    {action?.account && (
                      <div>
                        <dt>Account email</dt>
                        <dd>{flow.emailMasked}</dd>
                      </div>
                    )}
                    {Object.entries(fileRefs.current).map(([key, file]) => (
                      <div key={key}>
                        <dt>Attached document</dt>
                        <dd>{file.name}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : phase === "complete" ? (
                <div className="aio-action-result">
                  <span className="aio-action-success">
                    <Check size={25} />
                  </span>
                  <h3>
                    {action?.mode === "read"
                      ? "Your account information"
                      : "All set"}
                  </h3>
                  <p>{flow?.result?.summary}</p>
                  {flow?.result?.reference && (
                    <p className="aio-action-reference">
                      Reference <code>{flow.result.reference}</code>
                    </p>
                  )}
                  {flow?.result?.emailStatus && (
                    <p className="aio-action-note">
                      Receipt email:{" "}
                      {flow.result.emailStatus === "sent"
                        ? "accepted by the mail service"
                        : flow.result.emailStatus === "queued"
                          ? "queued for delivery"
                          : "could not be sent; your action was saved"}
                    </p>
                  )}
                  {flow?.result?.records?.map((r: any, i: number) => (
                    <article key={i} className="aio-action-record">
                      <h4>{r.title}</h4>
                      <dl>
                        {Object.entries(r.fields)
                          .filter(([, v]) => v)
                          .map(([key, value]) => (
                            <div key={key}>
                              <dt>{key}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          ))}
                      </dl>
                      {r.fields.Reference && kind === "my_tickets" && (
                        <button
                          type="button"
                          className="aio-action-text-button"
                          onClick={() => {
                            choose("support_reply");
                            setInput((v) => ({
                              ...v,
                              ticketId: r.fields.Reference,
                            }));
                          }}
                        >
                          Reply to this ticket
                        </button>
                      )}
                    </article>
                  ))}
                  {flow?.result?.href && (
                    <Link
                      className="aio-action-text-button"
                      href={flow.result.href}
                    >
                      Open dedicated page <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              ) : null}
              {error && (
                <p className="aio-action-error" role="alert">
                  {error}
                </p>
              )}
              {phase !== "complete" && !accountBlocked && (
                <CustomerActionSecurity
                  onToken={setToken}
                  resetKey={resetKey}
                />
              )}
            </div>
            <footer className="aio-action-footer">
              <button
                type="button"
                className="aio-action-back"
                disabled={busy}
                onClick={() => {
                  if (phase === "form" && step > 0) setStep((s) => s - 1);
                  else {
                    setKind(null);
                    setFlow(null);
                    setPhase("form");
                    requestKey.current = crypto.randomUUID();
                  }
                }}
              >
                <ArrowLeft size={15} />
                {phase === "form" && step > 0 ? "Back" : "All actions"}
              </button>
              {!accountBlocked &&
                (phase === "complete" ? (
                  <button className="ac-button" type="button" onClick={onClose}>
                    Back to chat
                  </button>
                ) : action?.mode === "read" ? (
                  <button
                    className="ac-button"
                    type="button"
                    disabled={busy || !securityReady}
                    onClick={() => run("inspect")}
                  >
                    {busy ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      "Load my information"
                    )}
                  </button>
                ) : (
                  <button
                    className="ac-button"
                    type="submit"
                    disabled={
                      busy ||
                      (phase === "verify" && code.length !== 6) ||
                      ((phase !== "form" || step === steps.length - 1) &&
                        !securityReady)
                    }
                  >
                    {busy ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Working…
                      </>
                    ) : phase === "form" ? (
                      step < steps.length - 1 ? (
                        "Continue"
                      ) : (
                        "Send verification code"
                      )
                    ) : phase === "verify" ? (
                      "Verify email"
                    ) : (
                      "Confirm action"
                    )}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                ))}
            </footer>
          </form>
        </>
      )}
    </section>
  );
}
