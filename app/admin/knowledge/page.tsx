"use client";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { auth } from "@/lib/firebase";
import { onAuthChange } from "@/lib/auth";
import { Upload, FileText, ShieldCheck } from "lucide-react";
export default function KnowledgePage() {
  const [docs, setDocs] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function call(init?: RequestInit) {
    const token = await auth.currentUser?.getIdToken();
    const r = await fetch("/api/admin/knowledge", {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init?.headers },
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function load() {
    try {
      setDocs((await call()).documents);
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(
    () =>
      onAuthChange((u) => {
        if (u) void load();
      }),
    [],
  );
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await call({
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      setSelected(d.document);
      setNotice(
        "PDF extracted. Review the text and audience before approving.",
      );
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function review(action: string) {
    setBusy(true);
    setError("");
    try {
      await call({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selected, action }),
      });
      setNotice(
        action === "approve"
          ? "Approved text is now available to AIO with source links."
          : "Document withdrawn from AIO.",
      );
      setSelected(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="ac-workspace-hero">
          <div>
            <span className="ac-eyebrow">
              <ShieldCheck size={16} />
              Reviewed sources
            </span>
            <h1>AIO knowledge library</h1>
            <p>
              Upload a company PDF, review its extracted text, then approve
              exactly what AIO may use.
            </p>
          </div>
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
        <form
          onSubmit={upload}
          className="ac-content-panel p-5 flex flex-wrap gap-4 items-end"
        >
          <label className="grid gap-2">
            Document title
            <input
              name="title"
              maxLength={180}
              className="ac-input"
              placeholder="Company handbook"
            />
          </label>
          <label className="grid gap-2">
            Searchable PDF · up to 3 MB, 60 pages
            <input
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
            />
          </label>
          <button className="ac-button" disabled={busy}>
            <Upload size={16} />
            {busy ? "Working…" : "Upload for review"}
          </button>
        </form>
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <section className="ac-content-panel p-4">
            <h2 className="font-semibold mb-3">Documents</h2>
            {!docs.length && <p>No documents uploaded yet.</p>}
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected({ ...d })}
                className="block text-left w-full rounded-xl border border-border p-3 mb-2"
              >
                <span className="flex gap-2 items-center">
                  <FileText size={16} />
                  {d.title}
                </span>
                <small className="text-foreground-muted">
                  {d.status} · {d.visibility} · {d.pageCount} pages
                </small>
              </button>
            ))}
          </section>
          <section className="ac-content-panel p-5">
            {selected ? (
              <div className="space-y-4">
                <label className="grid gap-2">
                  Source title
                  <input
                    value={selected.title}
                    maxLength={180}
                    onChange={(e) =>
                      setSelected({ ...selected, title: e.target.value })
                    }
                    className="ac-input"
                  />
                </label>
                <label className="grid gap-2">
                  Who may use this source?
                  <select
                    className="ac-input"
                    value={selected.visibility}
                    onChange={(e) =>
                      setSelected({ ...selected, visibility: e.target.value })
                    }
                  >
                    <option value="authenticated">
                      Signed-in accounts only
                    </option>
                    <option value="public">
                      Public — anyone may read the original PDF
                    </option>
                  </select>
                </label>
                <p className="text-sm text-foreground-muted">
                  Review for private data and inaccurate policy. Approving makes
                  the original PDF available to this audience; AIO uses the
                  reviewed text below.
                </p>
                <label className="grid gap-2">
                  Extracted text
                  <textarea
                    className="ac-input w-full min-h-[360px]"
                    value={selected.text}
                    onChange={(e) =>
                      setSelected({ ...selected, text: e.target.value })
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="ac-button"
                    disabled={busy}
                    onClick={() => review("approve")}
                  >
                    Approve reviewed text
                  </button>
                  <button
                    className="ac-button ac-button-secondary"
                    disabled={busy}
                    onClick={() => review("withdraw")}
                  >
                    Withdraw source
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-foreground-muted">
                Choose a document to review. Pending and withdrawn documents are
                excluded from AIO replies.
              </p>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
