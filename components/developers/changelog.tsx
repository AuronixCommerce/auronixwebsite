"use client";
import { useEffect, useState } from "react";
import { developerFetch } from "./client";
export function PublicApiNotices() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/developers/changelog")
      .then(async (r) => {
        if (!r.ok) throw Error("Team notices are temporarily unavailable.");
        const d = await r.json();
        if (active) setRows(d.notices);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="dev-section">
      <span className="dev-kicker">TEAM NOTICES</span>
      <h2>Model updates and service changes.</h2>
      {error && (
        <p role="status" className="dev-muted">
          {error}
        </p>
      )}
      {rows.map((n) => (
        <article className="dev-card dev-section" key={n.id}>
          <span className="dev-badge">
            {n.type} · {n.version}
          </span>
          <h3>{n.title}</h3>
          <p className="dev-preserve">{n.body}</p>
          {n.effectiveAt && (
            <p className="dev-fine">
              Effective {new Date(n.effectiveAt).toISOString().slice(0, 10)} UTC
            </p>
          )}
        </article>
      ))}
      {!error && !rows.length && (
        <p className="dev-muted">No additional published notices.</p>
      )}
    </section>
  );
}
export function AdminApiNotices() {
  const [rows, setRows] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>(null);
  async function load() {
    setRows((await developerFetch("?view=notices", undefined, true)).items);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  return (
    <section className="dev-card">
      <span className="dev-kicker">PUBLIC API NOTICES</span>
      <h2>Publish a model or version update.</h2>
      <p>
        Drafts remain private. Published notices appear on the API changelog.
        Include an effective date when announcing a future change or
        deprecation.
      </p>
      {error && (
        <div className="dev-alert dev-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="dev-alert" role="status">
          {message}
        </div>
      )}
      <form
        className="dev-form"
        key={selected?.id || "new"}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          void developerFetch(
            "",
            {
              action: "notice",
              id: selected?.id,
              title: f.get("title"),
              version: f.get("version"),
              body: f.get("body"),
              type: f.get("type"),
              published: f.get("published") === "on",
              effectiveAt: f.get("effectiveAt")
                ? new Date(
                    String(f.get("effectiveAt")) + "T00:00:00Z",
                  ).getTime()
                : null,
            },
            true,
          )
            .then(async (d) => {
              setMessage(d.message);
              setSelected(null);
              await load();
            })
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <div className="dev-form-grid">
          <label>
            Title
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              defaultValue={selected?.title || ""}
            />
          </label>
          <label>
            Version / model label
            <input
              name="version"
              required
              maxLength={60}
              defaultValue={selected?.version || "API v1"}
            />
          </label>
          <label>
            Notice type
            <select name="type" defaultValue={selected?.type || "update"}>
              <option value="update">Version update</option>
              <option value="model">Model update</option>
              <option value="deprecation">Deprecation</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>
          <label>
            Effective date (UTC, optional)
            <input
              name="effectiveAt"
              type="date"
              defaultValue={
                selected?.effectiveAt
                  ? new Date(selected.effectiveAt).toISOString().slice(0, 10)
                  : ""
              }
            />
          </label>
        </div>
        <label>
          Notice
          <textarea
            name="body"
            rows={5}
            minLength={10}
            maxLength={4000}
            required
            defaultValue={selected?.body || ""}
          />
        </label>
        <label className="dev-checkbox">
          <input
            name="published"
            type="checkbox"
            defaultChecked={selected?.published || false}
          />
          <span>Publish this notice on the public API changelog.</span>
        </label>
        <div className="dev-actions">
          <button className="dev-primary" disabled={busy}>
            Save notice
          </button>
          {selected && (
            <button
              className="dev-secondary"
              type="button"
              onClick={() => setSelected(null)}
            >
              New notice
            </button>
          )}
        </div>
      </form>
      <div className="dev-account-list">
        {rows.map((n) => (
          <button type="button" key={n.id} onClick={() => setSelected(n)}>
            <strong>{n.title}</strong>
            <span>
              {n.version} · {n.published ? "Published" : "Draft"} · {n.type}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
