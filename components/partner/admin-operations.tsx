"use client";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  RefreshCw,
  Users,
  Calendar,
  Bell,
  BarChart3,
  FileText,
} from "lucide-react";
export async function adminOperations(body?: any, view = "") {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw Error("Sign in to your administrator account.");
  const r = await fetch(
    "/api/admin/operations" + (view ? "?view=" + view : ""),
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    },
  );
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Please retry.");
  return d;
}
export function AdminOperations() {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("suppliers"),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [templates, setTemplates] = useState<any[]>([]);
  async function load() {
    setError("");
    try {
      const d = await adminOperations();
      setData(d);
      setTemplates(d.templates);
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) void load();
    });
    return stop;
  }, []);
  async function act(body: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await adminOperations(body);
      setNotice(
        d.emailStatus ? `Saved · email ${d.emailStatus}.` : "Changes saved.",
      );
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const supplier = data?.suppliers.find((s: any) => s.id === selected);
  return (
    <AdminLayout>
      <div className="op-admin">
        <div className="op-workspace-top">
          <div>
            <span className="op-kicker">PARTNER OPERATIONS</span>
            <h1>Every next step, connected.</h1>
            <p>
              Review suppliers, manage calls, and learn where visitors need
              help.
            </p>
          </div>
          <button className="op-secondary" onClick={() => void load()}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {error && (
          <p role="alert" className="op-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="op-notice">
            {notice}
          </p>
        )}
        <div className="op-tabs" role="tablist" aria-label="Operations">
          {[
            ["suppliers", Users],
            ["calls", Calendar],
            ["templates", FileText],
            ["feedback", Bell],
            ["analytics", BarChart3],
          ].map(([label, Icon]: any) => (
            <button
              key={label}
              role="tab"
              aria-selected={tab === label}
              onClick={() => setTab(label)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {!data ? (
          <p role="status">Loading operations…</p>
        ) : (
          <>
            {tab === "suppliers" && (
              <div className="op-admin-review">
                <aside className="op-card">
                  <label>
                    Find a supplier
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Company, email, reference"
                    />
                  </label>
                  <div className="op-supplier-list">
                    {data.suppliers
                      .filter((s: any) =>
                        (s.companyName + " " + s.email + " " + s.id)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((s: any) => (
                        <button
                          key={s.id}
                          className={selected === s.id ? "is-selected" : ""}
                          onClick={() => setSelected(s.id)}
                        >
                          <strong>{s.companyName || s.contactName}</strong>
                          <small>{s.email}</small>
                          <span className="op-badge">{s.status}</span>
                        </button>
                      ))}
                  </div>
                </aside>
                {!supplier ? (
                  <div className="op-card op-empty">
                    <Users />
                    <h2>Select a supplier.</h2>
                    <p>
                      Review details, requests, messages, documents, and
                      internal notes together.
                    </p>
                  </div>
                ) : (
                  <div className="op-stack">
                    <article className="op-card">
                      <div className="op-row">
                        <div>
                          <h2>{supplier.companyName}</h2>
                          <p>
                            {supplier.contactName} · {supplier.email}
                          </p>
                        </div>
                        <Link className="op-link" href="/admin/suppliers">
                          Edit full record
                        </Link>
                      </div>
                      <p className="op-ref">{supplier.id}</p>
                      <label>
                        Review status
                        <select
                          value={supplier.status}
                          disabled={busy}
                          onChange={async (e) => {
                            setBusy(true);
                            setError("");
                            try {
                              const token =
                                await auth.currentUser?.getIdToken();
                              const r = await fetch(
                                "/api/admin/suppliers/status",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    supplierId: supplier.id,
                                    status: e.target.value,
                                  }),
                                },
                              );
                              const d = await r.json();
                              if (!r.ok) throw Error(d.error);
                              await load();
                              setNotice("Status updated.");
                            } catch (e: any) {
                              setError(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {[
                            "new",
                            "reviewing",
                            "contacted",
                            "approved",
                            "rejected",
                            "archived",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <div className="op-detail-grid">
                        <p>
                          <strong>Categories</strong>
                          {supplier.categories || "Not provided"}
                        </p>
                        <p>
                          <strong>Phone</strong>
                          {supplier.phone || "Not provided"}
                        </p>
                        <p>
                          <strong>MOQ</strong>
                          {supplier.commercial?.minimumOrderQuantity ||
                            "Not provided"}
                        </p>
                        <p>
                          <strong>Pricing</strong>
                          {supplier.commercial?.pricingModel || "Not provided"}
                        </p>
                      </div>
                      <p>{supplier.message}</p>
                      <h3>Private documents</h3>
                      {Object.entries(supplier.documents || {}).map(
                        ([id, doc]: any) => (
                          <div className="op-list-row" key={id}>
                            <span>
                              {doc.name}
                              <small>
                                {doc.type} · {doc.status}
                              </small>
                            </span>
                            <button
                              className="op-link"
                              onClick={async () => {
                                try {
                                  const token =
                                    await auth.currentUser?.getIdToken();
                                  const r = await fetch(
                                    `/api/admin/suppliers/documents?supplierId=${encodeURIComponent(supplier.id)}&documentId=${encodeURIComponent(id)}`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    },
                                  );
                                  if (!r.ok) throw Error("Download failed.");
                                  const url = URL.createObjectURL(
                                      await r.blob(),
                                    ),
                                    a = document.createElement("a");
                                  a.href = url;
                                  a.download = doc.name;
                                  a.click();
                                  setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    1000,
                                  );
                                } catch (e: any) {
                                  setError(e.message);
                                }
                              }}
                            >
                              Download
                            </button>
                            <select
                              aria-label={`Review ${doc.name}`}
                              value={doc.status}
                              disabled={busy}
                              onChange={async (e) => {
                                setBusy(true);
                                try {
                                  const token =
                                    await auth.currentUser?.getIdToken();
                                  const r = await fetch(
                                    "/api/admin/suppliers/documents",
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                      },
                                      body: JSON.stringify({
                                        supplierId: supplier.id,
                                        documentId: id,
                                        status: e.target.value,
                                      }),
                                    },
                                  );
                                  if (!r.ok)
                                    throw Error("Document review failed.");
                                  await load();
                                } catch (e: any) {
                                  setError(e.message);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              <option value="pending">Pending</option>
                              {[
                                "approved",
                                "rejected",
                                "expired",
                                "archived",
                              ].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        ),
                      )}
                    </article>
                    <form
                      className="op-card"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          f = new FormData(form);
                        if (
                          await act({
                            action: "request-document",
                            supplierId: supplier.id,
                            type: f.get("type"),
                            title: f.get("title"),
                            message: f.get("message"),
                          })
                        )
                          form.reset();
                      }}
                    >
                      <h3>Request missing information</h3>
                      <label>
                        Document type
                        <select name="type">
                          {[
                            "catalog",
                            "brand-authorization",
                            "pricing",
                            "compliance",
                            "other",
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        What do you need?
                        <input name="title" required maxLength={160} />
                      </label>
                      <label>
                        Instructions
                        <textarea name="message" rows={3} maxLength={2000} />
                      </label>
                      <button className="op-secondary" disabled={busy}>
                        Send document request
                      </button>
                      {Object.entries(supplier.requests || {}).map(
                        ([id, r]: any) => (
                          <div className="op-list-row" key={id}>
                            <span>
                              {r.title}
                              <small>{r.status}</small>
                            </span>
                            {r.status !== "resolved" && (
                              <button
                                type="button"
                                className="op-link"
                                disabled={busy}
                                onClick={() =>
                                  void act({
                                    action: "resolve-request",
                                    supplierId: supplier.id,
                                    requestId: id,
                                  })
                                }
                              >
                                Mark complete
                              </button>
                            )}
                          </div>
                        ),
                      )}
                    </form>
                    <SupplierReply
                      key={supplier.id}
                      supplier={supplier}
                      templates={templates}
                      busy={busy}
                      act={act}
                    />
                    <article className="op-card">
                      <h3>Review timeline</h3>
                      <ol className="op-timeline">
                        <li>
                          <strong>Application received</strong>
                          <time>
                            {new Date(supplier.createdAt).toLocaleString()}
                          </time>
                        </li>
                        {Object.entries(supplier.timeline || {}).map(
                          ([id, t]: any) => (
                            <li key={id}>
                              <strong>
                                {t.title}
                                {t.visibility === "internal"
                                  ? " · Internal"
                                  : ""}
                              </strong>
                              <p>{t.message}</p>
                              <time>
                                {new Date(t.createdAt).toLocaleString()}
                              </time>
                            </li>
                          ),
                        )}
                      </ol>
                    </article>
                  </div>
                )}
              </div>
            )}
            {tab === "calls" && (
              <div className="op-two-column">
                <form
                  className="op-card"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await act({
                      action: "create-slot",
                      startsAt: new Date(String(f.get("startsAt"))).getTime(),
                      duration: Number(f.get("duration")),
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                      meetingUrl: f.get("meetingUrl"),
                    });
                  }}
                >
                  <h2>Publish call availability.</h2>
                  <p>
                    Times are entered in your device’s time zone. Only
                    published, unbooked times appear to customers.
                  </p>
                  <label>
                    Start time
                    <input name="startsAt" type="datetime-local" required />
                  </label>
                  <label>
                    Duration
                    <select name="duration">
                      {[15, 30, 45, 60].map((v) => (
                        <option key={v} value={v}>
                          {v} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Meeting link (optional)
                    <input
                      name="meetingUrl"
                      type="url"
                      placeholder="https://"
                    />
                  </label>
                  <button className="op-primary" disabled={busy}>
                    Publish time
                  </button>
                </form>
                <div className="op-stack">
                  {!data.slots.length && <p>No times published yet.</p>}
                  {data.slots.map((s: any) => (
                    <div className="op-card" key={s.id}>
                      <div className="op-row">
                        <h3>{new Date(s.startsAt).toLocaleString()}</h3>
                        <span className="op-badge">{s.status}</span>
                      </div>
                      <p>
                        {s.duration} minutes · {s.timeZone}
                      </p>
                      {s.email && <p>{s.email}</p>}
                      {s.status !== "cancelled" && (
                        <button
                          className="op-link"
                          disabled={busy}
                          onClick={() =>
                            void act({ action: "cancel-slot", slotId: s.id })
                          }
                        >
                          Cancel this time
                          {s.status === "booked" ? " and notify customer" : ""}
                        </button>
                      )}
                    </div>
                  ))}
                  <h3>Booking details</h3>
                  {data.bookings.map((b: any) => (
                    <div className="op-card" key={b.id}>
                      <h3>
                        {b.name} · {b.status}
                      </h3>
                      <p>{b.email}</p>
                      <p>{new Date(b.startsAt).toLocaleString()}</p>
                      <p>{b.topic}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "templates" && (
              <div className="op-stack">
                <p>
                  Templates are inserted into an editable draft. Nothing is sent
                  until an administrator selects Send.
                </p>
                {templates.map((t: any, i: number) => (
                  <div className="op-card" key={t.id}>
                    <label>
                      Template name
                      <input
                        value={t.title}
                        onChange={(e) =>
                          setTemplates((all) =>
                            all.map((v, j) =>
                              j === i ? { ...v, title: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Subject
                      <input
                        value={t.subject}
                        onChange={(e) =>
                          setTemplates((all) =>
                            all.map((v, j) =>
                              j === i ? { ...v, subject: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Message
                      <textarea
                        rows={4}
                        value={t.body}
                        onChange={(e) =>
                          setTemplates((all) =>
                            all.map((v, j) =>
                              j === i ? { ...v, body: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className="op-link"
                      onClick={() =>
                        setTemplates((all) => all.filter((_, j) => j !== i))
                      }
                    >
                      Remove template
                    </button>
                  </div>
                ))}
                <div className="op-actions">
                  <button
                    className="op-secondary"
                    disabled={templates.length >= 20}
                    onClick={() =>
                      setTemplates((all) => [
                        ...all,
                        {
                          id: crypto.randomUUID(),
                          title: "New template",
                          subject: "",
                          body: "",
                        },
                      ])
                    }
                  >
                    Add template
                  </button>
                  <button
                    className="op-primary"
                    disabled={busy}
                    onClick={() => void act({ action: "templates", templates })}
                  >
                    Save templates
                  </button>
                </div>
              </div>
            )}
            {tab === "feedback" && (
              <div className="op-stack">
                {!data.feedback.length && <p>No feedback received yet.</p>}
                {data.feedback.map((f: any) => (
                  <article className="op-card" key={f.id}>
                    <div className="op-row">
                      <h3>{f.kind}</h3>
                      <span className="op-badge">{f.status}</span>
                    </div>
                    <p>{f.path}</p>
                    <p>{f.message}</p>
                    {f.email && <p>Reply email (consent given): {f.email}</p>}
                    <time>{new Date(f.createdAt).toLocaleString()}</time>
                    <label>
                      Review state
                      <select
                        value={f.status}
                        disabled={busy}
                        onChange={(e) =>
                          void act({
                            action: "feedback-status",
                            id: f.id,
                            status: e.target.value,
                          })
                        }
                      >
                        {["new", "reviewing", "resolved"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
            {tab === "analytics" && (
              <div className="op-stack">
                <p>
                  Last 30 days · analytics-consented sessions only. These counts
                  describe measured activity, not every visitor.
                </p>
                <div className="op-metrics">
                  {[
                    ["Application starts", data.analytics.starts],
                    ["Submitted sessions", data.analytics.submitted],
                    ["Incomplete measured sessions", data.analytics.incomplete],
                  ].map(([label, count]) => (
                    <div className="op-card" key={label}>
                      <strong>{count}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="op-two-column">
                  <article className="op-card">
                    <h2>Form sections reached</h2>
                    {data.analytics.bySection.map((s: any) => (
                      <div className="op-list-row" key={s.section}>
                        <span>{s.section}</span>
                        <strong>{s.count}</strong>
                      </div>
                    ))}
                    <p>
                      A start without a submission in the same measured
                      day/session is counted as incomplete, not confirmed
                      abandonment.
                    </p>
                  </article>
                  <article className="op-card">
                    <h2>Video engagement</h2>
                    {data.analytics.videos.map((v: any) => (
                      <div className="op-list-row" key={v.video}>
                        <span>{v.video}</span>
                        <strong>
                          {v.started} starts / {v.completed} completions
                        </strong>
                      </div>
                    ))}
                    <p>
                      No form values, email addresses, or chat content are
                      collected.
                    </p>
                  </article>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
function SupplierReply({
  supplier,
  templates,
  busy,
  act,
}: {
  supplier: any;
  templates: any[];
  busy: boolean;
  act: (body: any) => Promise<boolean>;
}) {
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [internal, setInternal] = useState(false);
  return (
    <form
      className="op-card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await act({
            action: internal ? "note" : "reply",
            supplierId: supplier.id,
            subject,
            message,
          })
        )
          setMessage("");
      }}
    >
      <h3>Reply or record a review note</h3>
      <label>
        Use a template
        <select
          defaultValue=""
          onChange={(e) => {
            const t = templates.find((t) => t.id === e.target.value);
            if (t) {
              setSubject(t.subject);
              setMessage(t.body);
            }
          }}
        >
          <option value="">Choose a template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <label className="op-checkbox">
        <input
          type="checkbox"
          checked={internal}
          onChange={(e) => setInternal(e.target.checked)}
        />
        <span>Internal note — visible to administrators only</span>
      </label>
      {!internal && (
        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={160}
          />
        </label>
      )}
      <label>
        {internal ? "Review note" : "Customer message"}
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={5000}
        />
      </label>
      <button className="op-primary" disabled={busy}>
        {internal ? "Save internal note" : "Send reply to supplier"}
      </button>
    </form>
  );
}
