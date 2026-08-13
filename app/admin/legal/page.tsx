'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Save, Loader2 } from 'lucide-react';

const LEGAL_KEYS = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms of Service' },
  { key: 'disclaimer', label: 'Disclaimer' },
  { key: 'cookie-policy', label: 'Cookie Policy' },
];

export default function LegalAdminPage() {
  const [selected, setSelected] = useState('privacy');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;

    setLoading(true);

    return onValue(ref(db, `legal/${selected}`), (snapshot) => {
      const value = snapshot.val() || {};

      setTitle(value.title || '');
      setBody(
        Array.isArray(value.sections)
          ? value.sections
              .map((section: any) => `## ${section.heading}\n${section.body}`)
              .join('\n\n')
          : value.body || ''
      );

      setLoading(false);
    });
  }, [selected]);

  const save = async () => {
    if (!db) return;

    setSaving(true);

    const sections = body
      .split(/\n(?=## )/g)
      .map((section) => section.trim())
      .filter(Boolean)
      .map((section) => {
        const lines = section.split('\n');
        const heading = lines[0].replace(/^##\s*/, '').trim();
        const sectionBody = lines.slice(1).join('\n').trim();

        return {
          heading: heading || 'Section',
          body: sectionBody,
        };
      });

    try {
      await update(ref(db, `legal/${selected}`), {
        title,
        lastUpdated: Date.now(),
        updatedAt: Date.now(),
        createdAt: Date.now(),
        sections,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX ADMIN
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Legal</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Edit the legal content displayed on the public website.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {LEGAL_KEYS.map((item) => (
            <button
              key={item.key}
              onClick={() => setSelected(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium border transition-colors ${
                selected === item.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card hover:bg-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Page Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
                  placeholder={LEGAL_KEYS.find((x) => x.key === selected)?.label}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Content
                </label>
                <p className="text-xs text-foreground-muted mb-2">
                  Use headings like <code>## Heading</code> on separate lines.
                </p>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={22}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono"
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
                {saving ? 'Saving…' : 'Save Legal Content'}
              </button>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
