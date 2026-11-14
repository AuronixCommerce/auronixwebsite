"use client";
import { VerificationCode } from "@/components/ui/verification-code";
import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { CustomerActionSecurity } from "@/components/site/customer-action-security";
export async function portalApi(path: string, body?: any) {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(Error(data.error || "Please retry."), {
      status: r.status,
    });
  return data;
}
export function PartnerAccess({
  onVerified,
  initialEmail = "",
}: {
  onVerified: (email: string) => void;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [security, setSecurity] = useState(""),
    [reset, setReset] = useState(0);
  const required = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await portalApi("/api/partner/access", {
        action: challenge ? "verify" : "start",
        email,
        id: challenge,
        code,
        turnstileToken: security,
      });
      if (challenge) onVerified(d.email);
      else {
        setChallenge(d.id);
        setNotice(d.message);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setSecurity("");
      setReset((v) => v + 1);
    }
  }
  return (
    <form className="op-access op-card" onSubmit={submit}>
      <span className="op-icon">
        <ShieldCheck size={23} />
      </span>
      <h2>Your supplier workspace.</h2>
      <p>
        Verify your email to save drafts, track submissions, view notifications,
        and book calls. Use the email on your application.
      </p>
      <label>
        Business email
        <input
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          disabled={!!challenge}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {challenge && (
        <VerificationCode value={code} onChange={setCode} disabled={busy} autoFocus
          invalid={!!error} label="Email verification code" />
      )}
      <CustomerActionSecurity onToken={setSecurity} resetKey={reset} />
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="op-error" role="alert">
          {error}
        </p>
      )}
      <button className="op-primary" disabled={busy || (!!challenge && code.length !== 6) || (required && !security)}>
        {busy
          ? "Please wait…"
          : challenge
            ? "Verify and continue"
            : "Send verification code"}
        <Mail size={15} />
      </button>
      {challenge && (
        <button
          className="op-link"
          type="button"
          disabled={busy}
          onClick={() => {
            setChallenge("");
            setCode("");
            setNotice("");
          }}
        >
          Use another email or request a new code
        </button>
      )}
    </form>
  );
}
