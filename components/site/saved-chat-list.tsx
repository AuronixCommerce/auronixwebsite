"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Search, RefreshCw, Pencil, MessageSquare } from "lucide-react";
export function SavedChatList({
  onOpen,
}: {
  onOpen: (chat: { id: string; messages: any[] }) => void;
}) {
  const [signedIn, setSignedIn] = useState(false),
    [query, setQuery] = useState(""),
    [chats, setChats] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [renaming, setRenaming] = useState(""),
    [title, setTitle] = useState(""),
    [active, setActive] = useState("");
  async function api(path = "", init?: RequestInit) {
    const user = auth.currentUser;
    if (!user) throw Error("Sign in to sync history.");
    const token = await user.getIdToken();
    const r = await fetch(`/api/aio/conversations${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function refresh() {
    if (!auth.currentUser) return;
    try {
      setChats((await api(`?q=${encodeURIComponent(query)}`)).conversations);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setSignedIn(!!u);
        setChats([]);
        setActive("");
        onOpen({ id: crypto.randomUUID(), messages: [] });
        if (u) void refresh();
      }),
    [],
  );
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const update = () => void refresh(),
      reset = () => setActive("");
    window.addEventListener("aio-workspace-updated", update);
    window.addEventListener("aio-workspace-new", reset);
    return () => {
      window.removeEventListener("aio-workspace-updated", update);
      window.removeEventListener("aio-workspace-new", reset);
    };
  }, [query]);
  async function open(id: string) {
    setBusy(true);
    try {
      const d = await api(`?id=${id}`);
      onOpen(d.conversation);
      setActive(id);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("", {
        method: "PATCH",
        body: JSON.stringify({ id: renaming, title }),
      });
      setRenaming("");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aio-saved-chats" aria-label="Saved conversations">
      <div className="flex justify-between items-center">
        <strong>Saved workspace</strong>
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh saved chats"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {signedIn ? (
        <>
          <label className="aio-saved-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats and answers…"
              aria-label="Search saved conversations"
            />
          </label>
          <p className="text-xs text-foreground-muted">
            Synced to your account when chat memory is on.
          </p>
          <div className="aio-saved-list">
            {!chats.length && (
              <p className="text-sm text-foreground-muted">
                {query
                  ? "No matching conversations."
                  : "Your saved chats will appear here."}
              </p>
            )}
            {chats.map((c) => (
              <div
                key={c.id}
                className="aio-saved-row"
                data-active={active === c.id}
              >
                <button disabled={busy} onClick={() => open(c.id)}>
                  <MessageSquare size={14} />
                  <span>
                    {c.title}
                    {c.pinnedCount > 0 && (
                      <small>★ {c.pinnedCount} pinned</small>
                    )}
                  </span>
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setRenaming(c.id);
                    setTitle(c.title);
                  }}
                  aria-label={`Rename ${c.title}`}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))}
          </div>
          {renaming && (
            <form onSubmit={rename} className="grid gap-2">
              <input
                aria-label="Conversation name"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <button disabled={busy} className="ac-button" type="submit">
                  Save
                </button>
                <button type="button" onClick={() => setRenaming("")}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <p className="text-sm">
          <Link href="/seller/login">Sign in</Link> to search, rename, and sync
          conversations across devices.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
    </section>
  );
}
