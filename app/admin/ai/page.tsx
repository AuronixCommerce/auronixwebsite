'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Loader2, Save, Bot } from 'lucide-react';

const DEFAULTS = {
  chatEnabled: true,
  ticketAssistantEnabled: true,
  autoResponseEnabled: false,
  model: 'llama-3.3-70b-versatile',
  maxResponseLength: 700,
  welcomeMessage: 'Hi! I’m the Auronix Assistant. How can I help?',
  supportContext: '',
  systemInstructions:
    'Answer only using approved Auronix information. Never invent company facts.',
};

export default function AIAdminPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;

    return onValue(ref(db, 'site/settings/ai'), (snapshot) => {
      setForm({
        ...DEFAULTS,
        ...(snapshot.val() || {}),
      });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!db) return;

    setSaving(true);

    try {
      await set(ref(db, 'site/settings/ai'), {
        ...form,
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            <Bot className="w-4 h-4" />
            AURONIX AI
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            AI Settings
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Configure the Auronix website assistant and ticket AI behavior.
          </p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <Toggle
              label="Website AI Chat"
              checked={form.chatEnabled}
              onChange={(v) => setForm({ ...form, chatEnabled: v })}
            />

            <Toggle
              label="Ticket AI Assistant"
              checked={form.ticketAssistantEnabled}
              onChange={(v) =>
                setForm({ ...form, ticketAssistantEnabled: v })
              }
            />

            <Toggle
              label="Automatic Ticket Responses"
              checked={form.autoResponseEnabled}
              onChange={(v) => setForm({ ...form, autoResponseEnabled: v })}
            />

            <div>
              <label className="block text-sm font-medium mb-2">
                Groq Model
              </label>
              <input
                value={form.model}
                onChange={(e) =>
                  setForm({ ...form, model: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Response Length
              </label>
              <input
                type="number"
                value={form.maxResponseLength}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxResponseLength: Number(e.target.value),
                  })
                }
                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Welcome Message
              </label>
              <textarea
                value={form.welcomeMessage}
                onChange={(e) =>
                  setForm({ ...form, welcomeMessage: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Approved Support Context
              </label>
              <textarea
                value={form.supportContext}
                onChange={(e) =>
                  setForm({ ...form, supportContext: e.target.value })
                }
                rows={8}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                placeholder="Approved information the AI may use…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                System Instructions
              </label>
              <textarea
                value={form.systemInstructions}
                onChange={(e) =>
                  setForm({
                    ...form,
                    systemInstructions: e.target.value,
                  })
                }
                rows={8}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : 'Save AI Settings'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-background p-4 cursor-pointer">
      <span className="text-sm font-medium">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    </label>
  );
}
