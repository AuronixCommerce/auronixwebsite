'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { ArrowLeft, BarChart3, MailX } from 'lucide-react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { db } from '@/lib/firebase';

type ReasonRecord = { id: string; email?: string; reason?: string; otherReason?: string; method?: string; createdAt?: number };
const LABELS: Record<string, string> = { too_many_emails: 'Too many emails', not_relevant: 'Not relevant', never_signed_up: 'Did not subscribe', content_quality: 'Content quality', privacy_concerns: 'Privacy concerns', other: 'Other', prefer_not_to_say: 'Prefer not to say' };

export default function NewsletterReasonsPage() {
  const [records, setRecords] = useState<ReasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => onValue(ref(db, 'newsletterUnsubscribeReasons'), snapshot => {
    const value = snapshot.exists() ? snapshot.val() as Record<string, Omit<ReasonRecord, 'id'>> : {};
    setRecords(Object.entries(value).map(([id, item]) => ({ ...item, id })).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    setLoading(false);
  }), []);
  const counts = useMemo(() => records.reduce<Record<string, number>>((result, item) => { const key = item.reason || 'prefer_not_to_say'; result[key] = (result[key] || 0) + 1; return result; }, {}), [records]);
  const topReason = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return <AdminLayout><div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/admin/newsletter" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-foreground-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />Newsletter Manager</Link><div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Audience insights</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Unsubscribe Reasons</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">Understand why readers leave and use the feedback to improve newsletter relevance, quality, and frequency.</p></div></div>
  <div className="grid gap-4 sm:grid-cols-3"><Stat icon={MailX} label="Total unsubscribes" value={String(records.length)} /><Stat icon={BarChart3} label="Top reason" value={topReason ? LABELS[topReason[0]] || topReason[0] : 'No data'} /><Stat icon={BarChart3} label="Feedback comments" value={String(records.filter(item => item.otherReason).length)} /></div>
  <section className="ac-content-panel p-5"><h2 className="font-semibold">Reason breakdown</h2><div className="mt-5 space-y-4">{Object.keys(LABELS).map(key => { const count = counts[key] || 0; const percent = records.length ? Math.round(count / records.length * 100) : 0; return <div key={key}><div className="mb-1.5 flex justify-between gap-4 text-sm"><span>{LABELS[key]}</span><span className="text-foreground-muted">{count} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
  <section className="overflow-hidden ac-content-panel"><div className="border-b border-border p-5"><h2 className="font-semibold">Recent unsubscribe feedback</h2></div>{loading ? <div className="p-8 text-center text-sm text-foreground-muted">Loading feedback…</div> : records.length === 0 ? <div className="p-8 text-center text-sm text-foreground-muted">No unsubscribe reasons have been submitted yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-secondary/50 text-xs uppercase tracking-wider text-foreground-muted"><tr><th className="px-5 py-3 font-semibold">Email</th><th className="px-5 py-3 font-semibold">Reason</th><th className="px-5 py-3 font-semibold">Comment</th><th className="px-5 py-3 font-semibold">Confirmed</th><th className="px-5 py-3 font-semibold">Date</th></tr></thead><tbody className="divide-y divide-border">{records.map(item => <tr key={item.id}><td className="px-5 py-4 font-medium">{item.email || 'Unavailable'}</td><td className="px-5 py-4">{LABELS[item.reason || ''] || item.reason || 'Not provided'}</td><td className="max-w-md whitespace-pre-wrap px-5 py-4 text-foreground-muted">{item.otherReason || '—'}</td><td className="px-5 py-4 capitalize text-foreground-muted">{item.method || 'link'}</td><td className="whitespace-nowrap px-5 py-4 text-foreground-muted">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>}</section></div></AdminLayout>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof MailX; label: string; value: string }) {
  return <div className="ac-content-panel p-5"><Icon className="h-4 w-4 text-accent" /><div className="mt-4 text-xl font-semibold">{value}</div><div className="mt-1 text-xs text-foreground-muted">{label}</div></div>;
}
