"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileCheck,
  FileText,
  MessageCircle,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { PartnerAccess, portalApi } from "./access";
export function PartnerWorkspace({
  notificationsOnly = false,
}: {
  notificationsOnly?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [gate, setGate] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [tab, setTab] = useState(
      notificationsOnly ? "notifications" : "applications",
    );
  async function load() {
    setError("");
    try {
      const d = await portalApi("/api/partner/workspace");
      setData(d);
      setGate(false);
    } catch (e: any) {
      if (e.status === 401) setGate(true);
      else setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function act(body: any) {
    setBusy(body.action);
    setError("");
    try {
      await portalApi("/api/partner/workspace", body);
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function upload(
    event: React.FormEvent<HTMLFormElement>,
    supplierId: string,
    requestId: string,
  ) {
    event.preventDefault();
    setBusy(requestId);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("supplierId", supplierId);
    form.set("requestId", requestId);
    try {
      const r = await fetch("/api/partner/documents", {
        method: "POST",
        body: form,
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  if (gate) return <PartnerAccess onVerified={() => void load()} />;
  return (
    <div className="op-workspace">
      {error && (
        <p role="alert" className="op-error">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">
          {error ? "Unable to load the workspace." : "Opening your workspace…"}{" "}
          <button onClick={() => void load()} className="op-link">
            Retry
          </button>
        </p>
      ) : (
        <>
          <div className="op-workspace-top">
            <div>
              <span className="op-kicker">VERIFIED WORKSPACE</span>
              <h2>Welcome back.</h2>
              <p>{data.email}</p>
            </div>
            <div className="op-actions">
              <button className="op-secondary" onClick={() => void load()}>
                <RefreshCw size={15} />
                Refresh
              </button>
              <button
                className="op-link"
                onClick={async () => {
                  try {
                    await portalApi("/api/partner/access", {
                      action: "logout",
                    });
                    setData(null);
                    setGate(true);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
          <div
            className="op-tabs"
            role="tablist"
            aria-label="Workspace sections"
          >
            {["applications", "notifications", "calls", "support"].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "notifications" &&
                  data.notifications.filter((n: any) => !n.readAt).length >
                    0 && (
                    <b>
                      {data.notifications.filter((n: any) => !n.readAt).length}
                    </b>
                  )}
              </button>
            ))}
          </div>
          {tab === "applications" && (
            <div className="op-stack">
              {data.draft && (
                <div className="op-card op-inline">
                  <FileText />
                  <div>
                    <h3>You have a saved draft</h3>
                    <p>
                      Saved {new Date(data.draft.updatedAt).toLocaleString()}.
                      Files must be selected again.
                    </p>
                  </div>
                  <Link
                    className="op-secondary"
                    href="/supplier#supplier-draft"
                  >
                    Resume application
                  </Link>
                </div>
              )}
              {!data.submissions.length && (
                <Empty
                  title="No supplier submissions yet."
                  text="Use this verified email on your application to see it here."
                  href="/supplier"
                  label="Start an application"
                />
              )}
              {data.submissions.map((s: any) => (
                <article key={s.id} className="op-card">
                  <div className="op-row">
                    <h3>{s.companyName}</h3>
                    <span className="op-badge">{s.status}</span>
                  </div>
                  <p className="op-ref">Private reference: {s.id}</p>
                  <h4>Documents</h4>
                  {s.documents.length ? (
                    s.documents.map((doc: any) => (
                      <div className="op-list-row" key={doc.id}>
                        <FileCheck size={17} />
                        <span>
                          <a
                            href={`/api/partner/documents?supplierId=${encodeURIComponent(s.id)}&id=${encodeURIComponent(doc.id)}`}
                          >
                            {doc.name}
                          </a>
                          <small>{doc.reviewNote}</small>
                        </span>
                        <span className="op-badge">{doc.status}</span>
                      </div>
                    ))
                  ) : (
                    <p>No documents uploaded.</p>
                  )}
                  {s.requests
                    .filter((r: any) => r.status === "open")
                    .map((r: any) => (
                      <form
                        key={r.id}
                        className="op-request"
                        onSubmit={(e) => void upload(e, s.id, r.id)}
                      >
                        <strong>{r.title}</strong>
                        <p>{r.message}</p>
                        <label>
                          Requested document
                          <input
                            name="file"
                            type="file"
                            required
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx"
                          />
                        </label>
                        <small>Up to 12 MB. Documents stay private.</small>
                        <button className="op-secondary" disabled={!!busy}>
                          {busy === r.id ? "Uploading…" : "Upload document"}
                        </button>
                      </form>
                    ))}
                  <h4>Review timeline</h4>
                  <ol className="op-timeline">
                    <li>
                      <strong>Submission received</strong>
                      <time>{new Date(s.createdAt).toLocaleString()}</time>
                    </li>
                    {s.timeline.map((t: any) => (
                      <li key={t.id}>
                        <strong>{t.title}</strong>
                        <p>{t.message}</p>
                        <time>{new Date(t.createdAt).toLocaleString()}</time>
                      </li>
                    ))}
                  </ol>
                  <form
                    className="op-reply"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      void act({
                        action: "reply",
                        supplierId: s.id,
                        message: new FormData(form).get("message"),
                      }).then((success) => {
                        if (success) form.reset();
                      });
                    }}
                  >
                    <label>
                      Reply to the review team
                      <textarea
                        name="message"
                        required
                        maxLength={5000}
                        rows={3}
                      />
                    </label>
                    <button className="op-secondary" disabled={!!busy}>
                      Send reply
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
          {tab === "notifications" && (
            <div className="op-stack">
              <div className="op-row">
                <h3>Updates, in one place.</h3>
                <button
                  className="op-link"
                  disabled={!!busy}
                  onClick={() => void act({ action: "read", all: true })}
                >
                  Mark all as read
                </button>
              </div>
              {!data.notifications.length && (
                <Empty
                  title="You’re all caught up."
                  text="Application updates, document requests, and replies will appear here."
                />
              )}
              {data.notifications.map((n: any) => (
                <article
                  key={n.id}
                  className={`op-card op-notification ${n.readAt ? "" : "is-unread"}`}
                >
                  <Bell size={18} />
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.message}</p>
                    <time>{new Date(n.createdAt).toLocaleString()}</time>
                    {!n.readAt && (
                      <button
                        className="op-link"
                        disabled={!!busy}
                        onClick={() => void act({ action: "read", id: n.id })}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {tab === "calls" && (
            <div className="op-stack">
              <Link className="op-primary" href="/partnership-call">
                Book a partnership call
              </Link>
              {!data.bookings.length && (
                <Empty
                  title="No calls booked."
                  text="Choose a time published by the Auronix team."
                />
              )}
              {data.bookings.map((b: any) => (
                <article className="op-card" key={b.id}>
                  <div className="op-row">
                    <h3>{new Date(b.startsAt).toLocaleString()}</h3>
                    <span className="op-badge">{b.status}</span>
                  </div>
                  <p>{b.topic}</p>
                  <p>
                    {b.duration} minutes · displayed in your device’s time zone
                  </p>
                  {b.status === "confirmed" && (
                    <div className="op-actions">
                      {b.meetingUrl && (
                        <a
                          className="op-secondary"
                          href={b.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join call
                        </a>
                      )}
                      <button
                        className="op-link"
                        onClick={async () => {
                          setBusy(b.id);
                          try {
                            await portalApi("/api/partner/bookings", {
                              action: "cancel",
                              slotId: b.slotId,
                            });
                            await load();
                          } catch (e: any) {
                            setError(e.message);
                          } finally {
                            setBusy("");
                          }
                        }}
                        disabled={!!busy}
                      >
                        Cancel booking
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {tab === "support" && (
            <div className="op-stack">
              {!data.tickets.length && (
                <Empty
                  title="No support requests."
                  text="AIO can help you create an email-verified request for the team."
                  href="/aio/chat"
                  label="Open AIO"
                />
              )}
              {data.tickets.map((t: any) => (
                <article className="op-card" key={t.id}>
                  <div className="op-row">
                    <h3>{t.subject}</h3>
                    <span className="op-badge">{t.status}</span>
                  </div>
                  <p className="op-ref">{t.id}</p>
                  {t.messages.map((m: any) => (
                    <div className="op-message" key={m.id}>
                      <strong>
                        {["admin", "agent"].includes(m.role)
                          ? "Auronix team"
                          : m.role === "customer"
                            ? "You"
                            : "Automated support"}
                      </strong>
                      <p>{m.content}</p>
                    </div>
                  ))}
                  <p>Replies are also sent to your verified email.</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="op-card op-empty">
      <MessageCircle size={24} />
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link className="op-secondary" href={href}>
          {label}
        </Link>
      )}
    </div>
  );
}
