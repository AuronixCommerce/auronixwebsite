"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { CustomerActionSecurity } from "@/components/site/customer-action-security";
import { portalApi } from "./access";
export function trackInsight(
  event: string,
  metadata: Record<string, string> = {},
) {
  if (typeof window === "undefined" || !window.__AURONIX_CONSENT__?.analytics)
    return;
  try {
    let session = sessionStorage.getItem("auronix-insight-session");
    if (!session) {
      session = crypto.randomUUID();
      sessionStorage.setItem("auronix-insight-session", session);
    }
    void fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        session,
        path: location.pathname,
        ...metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
export function SiteTools() {
  const pathname = usePathname(),
    [open, setOpen] = useState(false),
    [done, setDone] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [token, setToken] = useState(""),
    [reset, setReset] = useState(0);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".op-feedback button:not(:disabled),.op-feedback input,.op-feedback textarea,.op-feedback select,.op-feedback a[href]",
          ),
        ).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open]);
  useEffect(() => {
    setOpen(false);
    setDone("");
    setError("");
  }, [pathname]);
  useEffect(() => {
    if (!["/supplier", "/become-a-supplier"].includes(pathname || "")) return;
    const sent = new Set<string>();
    const listener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("form") ||
        target.closest(".op-access,.op-feedback,.op-draft")
      )
        return;
      if (!sent.has("start")) {
        trackInsight("supplier_start");
        sent.add("start");
      }
      const label =
        target.getAttribute("aria-label") ||
        target.closest("label")?.textContent ||
        (target.id
          ? document.querySelector(`label[for="${CSS.escape(target.id)}"]`)
              ?.textContent
          : "") ||
        "";
      const section = /brand|pric|quantity|lead|incoterm|commercial/i.test(
        label,
      )
        ? "commercial"
        : /catalog|authorization|file/i.test(label)
          ? "documents"
          : /country|website|distribution|years/i.test(label)
            ? "business"
            : /consent|agree|submit/i.test(label)
              ? "review"
              : "company";
      if (!sent.has(section)) {
        trackInsight("supplier_section", { section });
        sent.add(section);
      }
    };
    document.addEventListener("change", listener);
    return () => document.removeEventListener("change", listener);
  }, [pathname]);
  if (!pathname || /^\/(admin|auth|api|seller\/dashboard)/.test(pathname))
    return null;
  return (
    <>
      <button
        className="op-feedback-trigger"
        aria-label="Give website feedback"
        onClick={() => {
          setOpen(true);
          setDone("");
          setError("");
        }}
      >
        <MessageSquare size={16} />
        <span>Feedback</span>
      </button>
      {open && (
        <div
          className="op-feedback-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section
            className="op-feedback op-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <button
              className="op-close"
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
            >
              <X size={19} />
            </button>
            <h2 id="feedback-title">Help us improve.</h2>
            {done ? (
              <p role="status">
                Thank you. Your feedback is saved. Reference: {done}
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  const values = new FormData(e.currentTarget);
                  try {
                    const d = await portalApi("/api/feedback", {
                      kind: values.get("kind"),
                      message: values.get("message"),
                      email: values.get("email"),
                      contactConsent: consent,
                      path: pathname,
                      turnstileToken: token,
                    });
                    setDone(d.reference);
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                    setToken("");
                    setReset((v) => v + 1);
                  }
                }}
              >
                <p>
                  Report a broken page or confusing step. Please leave out
                  passwords, codes, and private documents.
                </p>
                <label>
                  Feedback type
                  <select name="kind">
                    <option>Broken page</option>
                    <option>Confusing step</option>
                    <option>Suggestion</option>
                  </select>
                </label>
                <label>
                  What happened?
                  <textarea
                    name="message"
                    autoFocus
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={4}
                  />
                </label>
                <label className="op-checkbox">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>The team may contact me about this feedback.</span>
                </label>
                {consent && (
                  <label>
                    Reply email
                    <input name="email" type="email" required maxLength={320} />
                  </label>
                )}
                <CustomerActionSecurity resetKey={reset} onToken={setToken} />
                {error && (
                  <p className="op-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="op-primary"
                  disabled={
                    busy ||
                    (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)
                  }
                >
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
