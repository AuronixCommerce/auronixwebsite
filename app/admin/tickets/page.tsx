'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ref,
  onValue,
} from 'firebase/database';

import { db, auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { confirmAction, notifyAction } from '@/components/ui/confirm-action';

import type { SupportTicket } from '@/lib/types';

import {
  Search,
  Loader2,
  Sparkles,
  Send,
  Trash2,
  Clock,
  CheckCircle2,
  Zap,
  User,
  Bot,
  ShieldCheck,
} from 'lucide-react';

type TicketMessage = {
  role: 'customer' | 'admin' | 'ai';
  content: string;
  createdAt: number;
  automated?: boolean;
  createdBy?: string;
};

type TicketRecord = SupportTicket & {
  id: string;
  automatedResponse?: boolean;
  lastResponse?: string;
  respondedAt?: number;
  messages?: Record<string, TicketMessage>;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [filter, setFilter] = useState<
    'all' | 'open' | 'in-progress' | 'resolved' | 'closed'
  >('all');

  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );

  const [draft, setDraft] = useState('');

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [adminOnline, setAdminOnline] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    return onValue(
      ref(db, 'tickets'),
      (snapshot) => {
        const value = snapshot.val() || {};

        const list: TicketRecord[] = Object.entries(
          value
        ).map(([id, item]) => ({
          id,
          ...(item as SupportTicket),
        }));

        list.sort(
          (a, b) =>
            Number(b.updatedAt || b.createdAt || 0) -
            Number(a.updatedAt || a.createdAt || 0)
        );

        setTickets(list);
        setLoading(false);
      },
      (error) => {
        console.error(
          'Failed to load support tickets:',
          error
        );

        setTickets([]);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    let active = true;

    auth.currentUser
      .getIdToken()
      .then((token) =>
        fetch('/api/admin/availability', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      )
      .then((response) => response.json())
      .then((data) => {
        if (
          active &&
          typeof data.online === 'boolean'
        ) {
          setAdminOnline(data.online);
        }
      })
      .catch((error) => {
        console.error(
          'Failed to load admin availability:',
          error
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        filter === 'all' ||
        ticket.status === filter;

      const matchesSearch =
        !query ||
        ticket.subject
          ?.toLowerCase()
          .includes(query) ||
        ticket.name
          ?.toLowerCase()
          .includes(query) ||
        ticket.email
          ?.toLowerCase()
          .includes(query) ||
        ticket.message
          ?.toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, filter]);

  const selected =
    tickets.find(
      (ticket) => ticket.id === selectedId
    ) || null;

  const conversation = useMemo(() => {
    if (!selected) return [];

    const messages: TicketMessage[] = [];

    if (selected.message) {
      messages.push({
        role: 'customer',
        content: selected.message,
        createdAt: Number(
          selected.createdAt || 0
        ),
      });
    }

    if (
      selected.messages &&
      typeof selected.messages === 'object'
    ) {
      Object.values(selected.messages).forEach(
        (message) => {
          if (
            message &&
            typeof message === 'object' &&
            typeof message.content === 'string' &&
            message.content.trim()
          ) {
            messages.push(message);
          }
        }
      );
    }

    if (
      selected.lastResponse &&
      !messages.some(
        (message) =>
          message.content ===
          selected.lastResponse
      )
    ) {
      messages.push({
        role: selected.automatedResponse
          ? 'ai'
          : 'admin',
        content: selected.lastResponse,
        createdAt: Number(
          selected.respondedAt || 0
        ),
        automated: selected.automatedResponse,
      });
    }

    return messages.sort(
      (a, b) =>
        Number(a.createdAt || 0) -
        Number(b.createdAt || 0)
    );
  }, [selected]);

  const generateAIResponse = async () => {
    if (
      !selectedId ||
      !auth.currentUser ||
      generating
    ) {
      return;
    }

    setGenerating(true);

    try {
      const token =
        await auth.currentUser.getIdToken();

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
          data.error ||
            'Unable to generate AI response.'
        );
      }

      setDraft(data.response || '');
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to generate AI response.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const sendResponse = async () => {
    if (
      !selectedId ||
      !draft.trim() ||
      !auth.currentUser ||
      sending
    ) {
      return;
    }

    setSending(true);

    try {
      const token =
        await auth.currentUser.getIdToken();

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
          data.error ||
            'Unable to send support response.'
        );
      }

      setDraft('');
      notifyAction('Response sent successfully.');
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to send response.'
      );
    } finally {
      setSending(false);
    }
  };

  const deleteTicket = async (
    ticketId: string
  ) => {
    if (
      !auth.currentUser ||
      deleting
    ) {
      return;
    }

    if (
      !await confirmAction({
        title: 'Delete this support ticket?',
        description: 'The ticket and its conversation history will be permanently removed. This cannot be undone.',
        confirmLabel: 'Delete ticket',
        destructive: true,
      })
    ) {
      return;
    }

    setDeleting(true);

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/tickets/delete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticketId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to delete ticket.'
        );
      }

      if (selectedId === ticketId) {
        setSelectedId(null);
        setDraft('');
      }
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to delete ticket.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const automateOfflineTicket = async (
    ticketId: string
  ) => {
    if (adminOnline) {
      notifyAction(
        'Admin is currently online. Manual support is active.'
      );
      return;
    }

    try {
      const response = await fetch(
        '/api/support/auto-response',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            ticketId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Automatic response failed.'
        );
      }

      notifyAction(
        data.automated
          ? 'Automated support response sent.'
          : 'Automatic support was not used.'
      );
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Automatic response failed.'
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
              AURONIX ADMIN
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Support Tickets
            </h1>

            <p className="mt-2 text-sm text-foreground-muted">
              Review, respond to, automate, and manage support
              conversations.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
              adminOnline
                ? 'bg-green-500/10 text-green-700'
                : 'bg-yellow-500/10 text-yellow-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                adminOnline
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              }`}
            />

            Admin{' '}
            {adminOnline
              ? 'Online'
              : 'Offline'}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_170px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search tickets..."
              className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as typeof filter
              )
            }
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none"
          >
            <option value="all">
              All Tickets
            </option>
            <option value="open">
              Open
            </option>
            <option value="in-progress">
              In Progress
            </option>
            <option value="resolved">
              Resolved
            </option>
            <option value="closed">
              Closed
            </option>
          </select>
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-5">
          {/* Ticket list */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-foreground-muted">
                No tickets found.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[760px] overflow-y-auto">
                {filtered.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedId(
                        ticket.id
                      );
                      setDraft('');
                    }}
                    className={`w-full text-left p-4 transition-colors hover:bg-secondary/40 ${
                      selectedId === ticket.id
                        ? 'bg-secondary'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {ticket.subject ||
                            'Untitled ticket'}
                        </div>

                        <div className="text-xs text-foreground-muted mt-1 truncate">
                          {ticket.name ||
                            ticket.email}
                        </div>
                      </div>

                      {ticket.automatedResponse && (
                        <Zap className="w-4 h-4 text-yellow-600 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-[11px] rounded-full bg-secondary px-2.5 py-1">
                        {ticket.status}
                      </span>

                      {ticket.automatedResponse && (
                        <span className="text-[11px] rounded-full bg-yellow-500/10 text-yellow-700 px-2.5 py-1">
                          AI replied
                        </span>
                      )}

                      {ticket.messages &&
                        Object.keys(
                          ticket.messages
                        ).length > 0 && (
                          <span className="text-[11px] rounded-full bg-accent/10 text-accent px-2.5 py-1">
                            {
                              Object.keys(
                                ticket.messages
                              ).length
                            } messages
                          </span>
                        )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket detail */}
          <div className="rounded-2xl border border-border bg-card p-6 min-h-[600px]">
            {!selected ? (
              <div className="h-full min-h-[520px] flex items-center justify-center text-center">
                <div>
                  <Sparkles className="w-8 h-8 mx-auto text-foreground-muted mb-3" />

                  <h2 className="font-semibold">
                    Select a ticket
                  </h2>

                  <p className="text-sm text-foreground-muted mt-1">
                    Review the conversation and generate a
                    professional response.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-foreground-muted">
                      {selected.category ||
                        'Support'}
                    </div>

                    <h2 className="text-xl font-semibold mt-2">
                      {selected.subject ||
                        'Untitled ticket'}
                    </h2>

                    <p className="text-sm text-foreground-muted mt-2">
                      {selected.name} ·{' '}
                      {selected.email}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      deleteTicket(
                        selected.id
                      )
                    }
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-3 py-2 text-sm hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}

                    Delete
                  </button>
                </div>

                {/* Conversation */}
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-secondary/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                          Conversation
                        </div>

                        <div className="text-sm font-semibold mt-1">
                          {conversation.length}{' '}
                          message
                          {conversation.length === 1
                            ? ''
                            : 's'}
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 text-xs text-foreground-muted">
                        <ShieldCheck className="w-4 h-4" />
                        AI history enabled
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[520px] overflow-y-auto p-5 space-y-4">
                    {conversation.length === 0 ? (
                      <div className="py-10 text-center text-sm text-foreground-muted">
                        No conversation history.
                      </div>
                    ) : (
                      conversation.map(
                        (message, index) => (
                          <ConversationMessage
                            key={`${message.createdAt}-${index}`}
                            message={message}
                          />
                        )
                      )
                    )}
                  </div>
                </div>

                {/* Offline AI */}
                {!adminOnline && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-yellow-700 shrink-0" />

                      <div className="flex-1">
                        <h3 className="font-semibold">
                          Admin Offline
                        </h3>

                        <p className="text-sm text-foreground-muted mt-1">
                          AI automatic support is enabled for
                          normal support conversations.
                        </p>

                        <button
                          onClick={() =>
                            automateOfflineTicket(
                              selected.id
                            )
                          }
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
                        >
                          <Zap className="w-4 h-4" />
                          Send Automated Reply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Response editor */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="text-sm font-medium">
                      Response
                    </label>

                    <button
                      onClick={
                        generateAIResponse
                      }
                      disabled={
                        generating
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}

                      {generating
                        ? 'Generating...'
                        : 'Generate AI Response'}
                    </button>
                  </div>

                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(
                        event.target.value
                      )
                    }
                    rows={9}
                    placeholder="Write or generate a response..."
                    className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={
                      sendResponse
                    }
                    disabled={
                      sending ||
                      !draft.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}

                    {sending
                      ? 'Sending...'
                      : 'Send Response'}
                  </button>

                  {selected.status ===
                    'resolved' && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 text-green-700 px-4 py-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved
                    </div>
                  )}

                  <div className="ml-auto flex items-center gap-2 text-xs text-foreground-muted">
                    <Clock className="w-4 h-4" />

                    {selected.updatedAt
                      ? new Date(
                          selected.updatedAt
                        ).toLocaleString()
                      : 'No update time'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ConversationMessage({
  message,
}: {
  message: TicketMessage;
}) {
  const isCustomer =
    message.role === 'customer';

  const isAI =
    message.role === 'ai';

  const label = isCustomer
    ? 'Customer'
    : isAI
      ? 'AI Support'
      : 'Admin';

  const icon = isCustomer ? (
    <User className="w-4 h-4" />
  ) : isAI ? (
    <Bot className="w-4 h-4" />
  ) : (
    <ShieldCheck className="w-4 h-4" />
  );

  return (
    <div
      className={`flex ${
        isCustomer
          ? 'justify-start'
          : 'justify-end'
      }`}
    >
      <div
        className={`max-w-[90%] rounded-2xl border p-4 ${
          isCustomer
            ? 'bg-secondary border-border'
            : isAI
              ? 'bg-yellow-500/5 border-yellow-500/20'
              : 'bg-primary/5 border-primary/10'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isCustomer
                ? 'bg-background'
                : isAI
                  ? 'bg-yellow-500/10 text-yellow-700'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            {icon}
          </div>

          <div>
            <div className="text-xs font-semibold">
              {label}
            </div>

            {message.createdAt > 0 && (
              <div className="text-[10px] text-foreground-muted">
                {new Date(
                  message.createdAt
                ).toLocaleString()}
              </div>
            )}
          </div>

          {isAI &&
            message.automated && (
              <span className="ml-2 text-[10px] rounded-full bg-yellow-500/10 text-yellow-700 px-2 py-1">
                Automated
              </span>
            )}
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
