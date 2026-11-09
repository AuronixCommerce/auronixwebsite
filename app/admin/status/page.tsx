"use client";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { auth } from "@/lib/firebase";
import { onAuthChange } from "@/lib/auth";
import {
  SERVICE_NAMES,
  SERVICE_STATES,
  INCIDENT_STATES,
} from "@/lib/service-status";
import Link from "next/link";
export default function StatusAdmin() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    const r = await fetch("/api/status", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }
  useEffect(
    () =>
      onAuthChange((u) => {
        if (u) void load();
      }),
    [],
  );
  async function publish(body: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const token = await auth.currentUser?.getIdToken(),
        r = await fetch("/api/admin/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice("Status update published.");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  function incident(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void publish({
      action: "incident",
      title: f.get("title"),
      body: f.get("body"),
      status: f.get("status"),
      serviceIds: f.getAll("serviceIds"),
      startAt: f.get("startAt")
        ? new Date(String(f.get("startAt"))).getTime()
        : 0,
      endAt: f.get("endAt") ? new Date(String(f.get("endAt"))).getTime() : 0,
    });
  }
  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="ac-workspace-hero">
          <div>
            <span className="ac-eyebrow">Public communication</span>
            <h1>Service status</h1>
            <p>
              Publish service conditions, maintenance, and incident updates.
            </p>
          </div>
          <Link className="ac-button ac-button-secondary" href="/status">
            View public status
          </Link>
        </header>
        {error && (
          <p role="alert" className="ac-alert ac-alert-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="ac-alert">
            {notice}
          </p>
        )}
        <section className="ac-content-panel p-5 grid gap-4 sm:grid-cols-2">
          {Object.entries(SERVICE_NAMES).map(([id, name]) => (
            <label key={id} className="grid gap-2">
              {name}
              <select
                className="ac-input"
                disabled={busy}
                value={
                  data?.services.find((s: any) => s.id === id)?.status ||
                  "unknown"
                }
                onChange={(e) =>
                  publish({
                    action: "service",
                    serviceId: id,
                    status: e.target.value,
                  })
                }
              >
                {SERVICE_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <form className="ac-content-panel p-5 grid gap-4" onSubmit={incident}>
          <h2 className="font-semibold text-xl">New incident or maintenance</h2>
          <input
            className="ac-input"
            name="title"
            aria-label="Incident title"
            placeholder="Incident title"
            required
            minLength={3}
            maxLength={180}
          />
          <textarea
            className="ac-input min-h-[120px]"
            name="body"
            aria-label="Public incident description"
            placeholder="Describe the impact and next update…"
            required
            minLength={5}
            maxLength={4000}
          />
          <select
            className="ac-input"
            name="status"
            aria-label="Incident state"
          >
            {INCIDENT_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-2">Affected services</legend>
            {Object.entries(SERVICE_NAMES).map(([id, name]) => (
              <label key={id}>
                <input type="checkbox" name="serviceIds" value={id} /> {name}
              </label>
            ))}
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              Start (optional)
              <input
                className="ac-input w-full"
                name="startAt"
                type="datetime-local"
              />
            </label>
            <label>
              End (optional)
              <input
                className="ac-input w-full"
                name="endAt"
                type="datetime-local"
              />
            </label>
          </div>
          <button className="ac-button justify-self-start" disabled={busy}>
            Publish incident
          </button>
        </form>
        {data?.incidents.map((i: any) => (
          <form
            className="ac-content-panel p-5 grid gap-3"
            key={i.id}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void publish({
                action: "update",
                id: i.id,
                status: f.get("status"),
                body: f.get("body"),
              });
            }}
          >
            <h2 className="font-semibold">{i.title}</h2>
            <p>{i.body}</p>
            <select
              className="ac-input"
              name="status"
              defaultValue={i.status}
              aria-label="New incident status"
            >
              {INCIDENT_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <textarea
              className="ac-input"
              name="body"
              placeholder="Public progress update…"
              aria-label="Incident progress update"
              required
              minLength={3}
              maxLength={2000}
            />
            <button className="ac-button justify-self-start" disabled={busy}>
              Publish update
            </button>
          </form>
        ))}
      </div>
    </AdminLayout>
  );
}
