"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
export function ServiceStatus() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/status", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError("");
    } catch {
      setError("We could not load current status updates. Please try again.");
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-5 pt-32 pb-20 space-y-8">
      <header className="flex flex-wrap gap-5 justify-between items-center">
        <div>
          <p className="ac-eyebrow">
            <Activity size={16} />
            Auronix service status
          </p>
          <h1 className="text-4xl font-semibold mt-4">Keeping you informed.</h1>
          <p className="mt-4 text-foreground-muted">
            Published service updates, incidents, and planned maintenance.
          </p>
        </div>
        <button className="ac-button ac-button-secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      {error && (
        <p className="ac-alert ac-alert-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading status…</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.services.map((s: any) => (
              <article key={s.id} className="ac-content-panel p-5">
                <h2>{s.name}</h2>
                <p className="status-service mt-4" data-status={s.status}>
                  <i />
                  {s.status === "unknown" ? "No status published" : s.status}
                </p>
              </article>
            ))}
          </div>
          <p className="text-xs text-foreground-muted">
            {data.updatedAt
              ? `Last published update: ${new Date(data.updatedAt).toLocaleString()}`
              : "No service reports published yet."}{" "}
            · Updates are published by Auronix; this page does not measure
            uptime.
          </p>
          {data.maintenance && (
            <article className="ac-content-panel p-6">
              <p className="ac-eyebrow">
                {data.maintenance.active
                  ? "Maintenance in progress"
                  : "Upcoming maintenance"}
              </p>
              <h2 className="text-xl mt-3">{data.maintenance.title}</h2>
              <p className="mt-3">{data.maintenance.message}</p>
              <p className="mt-3 text-sm">
                {data.maintenance.startAt &&
                  new Date(data.maintenance.startAt).toLocaleString()}
                {data.maintenance.endAt &&
                  ` — ${new Date(data.maintenance.endAt).toLocaleString()}`}
              </p>
            </article>
          )}
          <section>
            <h2 className="text-2xl font-semibold mb-5">Incident history</h2>
            {!data.incidents.length && (
              <p className="ac-content-panel p-6">
                No incidents have been published.
              </p>
            )}
            {data.incidents.map((i: any) => (
              <article className="ac-content-panel p-6 mb-4" key={i.id}>
                <p className="ac-eyebrow">
                  {i.status} · {new Date(i.createdAt).toLocaleString()}
                </p>
                <h3 className="text-xl mt-3 font-semibold">{i.title}</h3>
                <p className="mt-3 whitespace-pre-wrap">{i.body}</p>
                {i.startAt > 0 && (
                  <p className="text-sm mt-3">
                    Scheduled: {new Date(i.startAt).toLocaleString()}
                    {i.endAt > 0 && ` — ${new Date(i.endAt).toLocaleString()}`}
                  </p>
                )}
                {i.updates.map((u: any, n: number) => (
                  <div key={n} className="border-l-2 border-border pl-4 mt-5">
                    <small>
                      {u.status} · {new Date(u.createdAt).toLocaleString()}
                    </small>
                    <p className="whitespace-pre-wrap mt-2">{u.body}</p>
                  </div>
                ))}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
