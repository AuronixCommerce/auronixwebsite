'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import type { SupportTicket } from '@/lib/types';
import {
  Search,
  Loader2,
  Sparkles,
  Send,
} from 'lucide-react';

export default function TicketsAdminPage() {
  const [tickets, setTickets] = useState<Record<string, SupportTicket>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!db) return;

    return onValue(ref(db, 'tickets'), (snapshot) => {
      setTickets(snapshot.val() || {});
      setLoading(false);
    });
  }, []);

  const entries = Object.entries(tickets).filter(([id, ticket]) => {
    const q = search.toLowerCase();

    return (
      !q ||
      id.toLowerCase().includes(q) ||
      ticket.name?.toLowerCase().includes(q) ||
      ticket.email?.toLowerCase().includes(q) ||
      ticket.subject?.toLowerCase().includes(q) ||
      ticket.message?.toLowerCase().includes(q)
    );
  });

  const selected = selectedId
    ? tickets[selectedId]
    : null;

  const generateAI = async () => {
    if (!selectedId || !auth.currentUser) return;

    setGenerating(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/tickets/ai-response',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticketId: selectedId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'AI failed to generate a response.'
        );
      }

      setDraft(data.response || '');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to generate AI response.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedId || !draft.trim() || !auth.currentUser) return;

    setSending(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/tickets/send-response',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticketId: selectedId,
            response: draft.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to send response.'
        );
      }

      setDraft('');

      await update(ref(db, `tickets/${selectedId}`), {
        status: 'resolved',
        updatedAt: Date.now(),
      });

      alert('Response sent successfully.');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to send response.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX ADMIN
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Support Tickets
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Review tickets and generate AI-assisted responses.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm"
          />
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-5">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="p-10 text-center text-sm text-foreground-muted">
                No tickets found.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[700px] overflow-y-auto">
                {entries.map(([id, ticket]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedId(id);
                      setDraft('');
                    }}
                    className={`w-full text-left p-4 hover:bg-secondary/40 transition-colors ${
                      selectedId === id
                        ? 'bg-secondary'
                        : ''
                    }`}
                  >
                    <div className="font-medium truncate">
                      {ticket.subject || 'Untitled ticket'}
                    </div>

                    <div className="text-xs text-foreground-muted mt-1 truncate">
                      {ticket.name || ticket.email}
                    </div>

                    <div className="mt-2">
                      <span className="text-[11px] rounded-full bg-secondary px-2 py-1">
                        {ticket.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            {!selected ? (
              <div className="h-full min-h-[400px] flex items-center justify-center text-center">
                <div>
                  <Sparkles className="w-8 h-8 mx-auto text-foreground-muted mb-3" />
                  <h2 className="font-semibold">
                    Select a ticket
                  </h2>
                  <p className="text-sm text-foreground-muted mt-1">
                    Choose a ticket to review and generate an AI response.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-foreground-muted">
                    {selected.category}
                  </div>

                  <h2 className="text-xl font-semibold mt-2">
                    {selected.subject}
                  </h2>

                  <p className="text-sm text-foreground-muted mt-2">
                    {selected.name} · {selected.email}
                  </p>
                </div>

                <div className="rounded-2xl bg-secondary p-5">
                  <div className="text-xs font-medium uppercase tracking-wider text-foreground-muted mb-3">
                    Customer message
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="text-sm font-medium">
                      Response
                    </label>

                    <button
                      onClick={generateAI}
                      disabled={generating}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}

                      {generating
                        ? 'Generating…'
                        : 'Generate AI Response'}
                    </button>
                  </div>

                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={10}
                    placeholder="Generate an AI response, or write one manually…"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-relaxed"
                  />
                </div>

                <button
                  onClick={sendResponse}
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}

                  {sending ? 'Sending…' : 'Send Response'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}