'use client';

import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { auth } from '@/lib/firebase';
import { getData, pushData, subscribeToList, getTimestamp } from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, SupportTicket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { LoadingState, EmptyState } from '@/components/site/states';
import { TICKET_CATEGORIES } from '@/lib/constants';
import { Loader2, Plus, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SellerSupportPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<(SupportTicket & { id: string })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: '', category: '', message: '' });

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const p = await getData<UserProfile>(`users/${user.uid}`);
        setProfile(p);
        const sub = subscribeToList<SupportTicket>('tickets', (data) => {
          const mine = data.filter((t) => t.sellerUid === user.uid);
          setTickets(mine);
        });
        return sub;
      } catch {}
      setLoading(false);
    });
    return () => { unsub(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || submitting) return;
    if (!form.subject.trim() || !form.category || !form.message.trim()) {
      toast({ title: 'All fields are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const now = getTimestamp();
      await pushData('tickets', {
        name: profile?.name || profile?.email || '',
        email: profile?.email || auth.currentUser.email || '',
        sellerUid: auth.currentUser.uid,
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'open',
        createdAt: now,
        updatedAt: now,
      } as unknown as Record<string, unknown>);
      toast({ title: 'Ticket created', description: 'We will respond soon.' });
      setForm({ subject: '', category: '', message: '' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Failed to create ticket', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;

  return (
    <SellerLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Support</h1>
          <p className="text-sm text-foreground-muted">Create and track your support tickets.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Ticket
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6 mb-6">
          <div>
            <Label className="mb-2 block">Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
          </div>
          <div>
            <Label className="mb-2 block">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Message</Label>
            <Textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={4} required />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Ticket'}
          </Button>
        </form>
      )}

      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet." description="Create a ticket if you need help with your seller account." />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{t.subject}</h3>
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium',
                  t.status === 'open' && 'bg-blue-500/10 text-blue-600',
                  t.status === 'in-progress' && 'bg-yellow-500/10 text-yellow-600',
                  t.status === 'resolved' && 'bg-green-500/10 text-green-600',
                  t.status === 'closed' && 'bg-secondary text-foreground-muted',
                )}>
                  {t.status}
                </span>
              </div>
              <p className="text-sm text-foreground-muted line-clamp-2">{t.message}</p>
              <p className="text-xs text-foreground-muted mt-2">{t.category} · {new Date(t.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </SellerLayout>
  );
}
