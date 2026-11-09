"use client";
import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
export default function SourcePage({ params }: { params: { id: string } }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch(`/api/aio/knowledge/${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!r.ok) throw Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = "auronix-knowledge.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="max-w-2xl mx-auto px-6 py-32 space-y-6">
      <p className="ac-eyebrow">AIO approved source</p>
      <h1 className="text-3xl font-semibold">Read the company document</h1>
      <p>
        Download the approved original PDF to check the source behind an AIO
        reply. Some sources require you to sign in.
      </p>
      {error && <p role="alert">{error}</p>}
      <button className="ac-button" onClick={download} disabled={busy}>
        {busy ? "Preparing…" : "Download source PDF"}
      </button>
      <Link href="/aio/chat" className="block">
        Back to AIO
      </Link>
    </main>
  );
}
