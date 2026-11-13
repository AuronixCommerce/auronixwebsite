"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Save, CheckCircle2, Link2 } from "lucide-react";
import { PartnerAccess, portalApi } from "./access";
import { emailAddress, checklist } from "@/lib/partner/model";
export function SupplierDraftTools({
  form,
  onRestore,
  catalog,
  authorization,
}: {
  form: any;
  onRestore: (value: any) => void;
  catalog: boolean;
  authorization: boolean;
}) {
  const [gate, setGate] = useState(false),
    [session, setSession] = useState(""),
    [draft, setDraft] = useState<any>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    try {
      const d = await portalApi("/api/partner/workspace");
      setSession(d.email);
      setDraft(d.draft);
    } catch {}
  }
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    if (!session) {
      setGate(true);
      return;
    }
    if (form.email && emailAddress(form.email) !== session) {
      setError(
        "Your form email differs from the verified email. Change the form email or select Use another email before saving.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await portalApi("/api/partner/workspace", { action: "draft", form });
      setNotice(
        "Draft saved securely. Return with this verified email to resume. Select your files again when you return.",
      );
      await load();
    } catch (e: any) {
      if (e.status === 401) {
        setSession("");
        setGate(true);
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="op-draft op-card"
      id="supplier-draft"
      aria-label="Application checklist and saved draft"
    >
      <div className="op-row">
        <div>
          <span className="op-kicker">BEFORE YOU SUBMIT</span>
          <h2>A clear path to a complete application.</h2>
        </div>
        <Link className="op-link" href="/supplier/track">
          <Link2 size={15} />
          Track a submission
        </Link>
      </div>
      <ul className="op-checklist">
        {checklist(form, { catalog, authorization }).map((item) => (
          <li key={item.label} data-complete={item.complete}>
            <CheckCircle2 size={17} />
            <span>
              {item.label}
              <small>
                {item.required ? "Required" : "Optional supporting information"}
              </small>
            </span>
            <b>
              {item.complete ? "Ready" : item.required ? "Needed" : "Optional"}
            </b>
          </li>
        ))}
      </ul>
      <div className="op-actions">
        <button
          type="button"
          className="op-secondary"
          onClick={() => void save()}
          disabled={busy}
        >
          <Save size={15} />
          {busy ? "Saving…" : "Save & resume later"}
        </button>
        {draft && (
          <button
            type="button"
            className="op-secondary"
            onClick={() => {
              onRestore({ ...draft.form, consent: false });
              setNotice(
                "Draft restored. Review the details, reselect files, and confirm contact permission.",
              );
            }}
          >
            Restore saved draft
          </button>
        )}
        {session && (
          <>
            <span className="op-muted">Verified: {session}</span>
            <button
              type="button"
              className="op-link"
              onClick={async () => {
                try {
                  await portalApi("/api/partner/access", { action: "logout" });
                  setSession("");
                  setDraft(null);
                  setGate(true);
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              Use another email
            </button>
          </>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="op-error">
          {error}
        </p>
      )}
      {gate && (
        <div className="op-draft-access">
          <PartnerAccess
            initialEmail={form.email}
            onVerified={(email) => {
              setSession(email);
              setGate(false);
              void load();
              setNotice(
                "Email verified. Select Save & resume later to store this draft.",
              );
            }}
          />
          <button
            type="button"
            className="op-link"
            onClick={() => setGate(false)}
          >
            Close verification
          </button>
        </div>
      )}
    </section>
  );
}
