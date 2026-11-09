"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MailCheck,
  RefreshCw,
  Search,
  Send,
  TriangleAlert,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Spinner } from "@/components/design/primitives";
import { auth } from "@/lib/firebase";
import { onAuthChange } from "@/lib/auth";

async function call(init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/admin/email-delivery", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Email delivery request failed.");
  return data;
}

export default function EmailDeliveryPage() {
  const [data, setData] = useState<any>({
    deliveries: [],
    events: [],
    stats: {},
    queue: [],
    alerts: [],
    worker: {},
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      setData(await call());
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load email delivery.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(
    () =>
      onAuthChange((user) => {
        if (user) load();
        else setLoading(false);
      }),
    [],
  );
  const test = async () => {
    setTesting(true);
    setNotice("");
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ action: "test-connection" }),
      });
      setNotice("Transactional email connection verified.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Connection check failed.",
      );
    } finally {
      setTesting(false);
    }
  };
  const acknowledge = async (id: string) => {
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ action: "acknowledge-alert", id }),
      });
      await load();
    } catch (e) {
      setError(String(e));
    }
  };
  const retry = async (id?: string) => {
    setTesting(true);
    setError("");
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ action: "retry-queue", id }),
      });
      setNotice("Due email retries processed.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setTesting(false);
    }
  };
  const filtered = useMemo(
    () =>
      data.deliveries.filter((item: any) =>
        `${item.recipient} ${item.subject} ${item.event} ${item.status} ${item.applicationId}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.deliveries, query],
  );
  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="ac-workspace-hero">
          <div>
            <span className="ac-eyebrow">
              <MailCheck className="h-4 w-4" /> Delivery operations
            </span>
            <h1>Email delivery</h1>
            <p>
              See every transactional partner message, delivery result, bounce,
              and complaint in one operational view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="ac-button ac-button-secondary" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="ac-button" onClick={test} disabled={testing}>
              {testing ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Test connection
            </button>
          </div>
        </header>
        {error && (
          <div className="ac-alert ac-alert-error">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}
        {notice && (
          <div className="ac-alert ac-alert-success">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}
        {loading ? (
          <div className="ac-content-panel flex min-h-[300px] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <>
            <section className="ac-content-panel p-5 space-y-3">
              <h2 className="text-xl font-semibold">Retry queue & alerts</h2>
              <p className="text-sm text-foreground-muted">
                SMTP acceptance is shown as sent. Delivered requires a signed
                provider webhook. Security emails stop retrying before their
                codes or links expire.
              </p>
              {!data.schedulerConfigured && (
                <p role="alert" className="ac-alert ac-alert-error">
                  Set CRON_SECRET on your deployment to activate the scheduled
                  queue worker.
                </p>
              )}
              <p className="text-sm">
                Last queue run:{" "}
                {data.worker?.emailQueue?.checkedAt
                  ? new Date(data.worker.emailQueue.checkedAt).toLocaleString()
                  : "No scheduled run recorded yet."}
              </p>
              <button
                disabled={testing}
                onClick={() => retry()}
                className="ac-button ac-button-secondary"
              >
                Process due retries
              </button>
              {data.alerts?.map((a: any) => (
                <div key={a.id} className="ac-alert ac-alert-error">
                  <strong>{a.subject}</strong>
                  <p>
                    {a.recipient} · {a.status}
                  </p>
                  <p>{a.message}</p>
                  <button
                    className="ac-button ac-button-secondary"
                    onClick={() => acknowledge(a.id)}
                  >
                    Acknowledge alert
                  </button>
                </div>
              ))}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr>
                      <th>Recipient / subject</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Next attempt</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queue
                      ?.filter((j: any) =>
                        `${j.subject} ${j.recipient} ${j.status}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((j: any) => (
                        <tr key={j.id}>
                          <td>
                            {j.recipient}
                            <small className="block">{j.subject}</small>
                          </td>
                          <td>
                            {j.status}
                            {j.lastError && (
                              <small className="block">{j.lastError}</small>
                            )}
                          </td>
                          <td>{j.attempts}/6</td>
                          <td>
                            {j.status === "queued"
                              ? new Date(j.nextAttemptAt).toLocaleString()
                              : "—"}
                          </td>
                          <td>
                            {j.status === "queued" && (
                              <button
                                disabled={testing}
                                onClick={() => retry(j.id)}
                                className="ac-button ac-button-secondary"
                              >
                                Retry now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!data.queue?.length && (
                  <p className="py-5 text-sm">No queued messages yet.</p>
                )}
              </div>
            </section>
            <div className="ac-report-kpis">
              {["sent", "delivered", "failed", "bounced"].map((status) => (
                <article className="ac-content-panel" key={status}>
                  <span>{status}</span>
                  <strong>{data.stats[status] || 0}</strong>
                </article>
              ))}
            </div>
            <section className="ac-content-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Transactional delivery log
                  </h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Newest 500 system emails.
                  </p>
                </div>
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                  <input
                    className="h-10 rounded-xl border border-border pl-9 pr-3"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search recipient or event…"
                  />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Recipient</th>
                      <th>Subject</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: any) => (
                      <tr key={item.id}>
                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                        <td>{item.recipient}</td>
                        <td>{item.subject}</td>
                        <td>{item.event}</td>
                        <td>
                          <span
                            className="ac-delivery-status"
                            data-status={item.status}
                          >
                            {item.status}
                          </span>
                          {item.error && <small>{item.error}</small>}
                        </td>
                        <td className="font-mono text-xs">
                          {item.applicationId || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p className="p-10 text-center text-sm text-foreground-muted">
                    No matching delivery records.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
