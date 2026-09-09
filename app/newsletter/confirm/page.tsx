'use client';
import { Spinner } from '@/components/design/primitives';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { SiteLayout } from '@/components/site/site-layout';

export default function NewsletterConfirmPage() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your secure subscription…');
  useEffect(() => { let active = true; void (async () => { try { const response = await fetch('/api/newsletter/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to confirm this subscription.'); if (active) { setState('success'); setMessage('Your email is confirmed. You can now receive Auronix Commerce newsletters.'); } } catch (error) { if (active) { setState('error'); setMessage(error instanceof Error ? error.message : 'Unable to confirm this subscription.'); } } })(); return () => { active = false; }; }, [token]);
  return <SiteLayout><main className="flex min-h-[68vh] items-center justify-center bg-background px-5 py-16"><div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-8 text-center shadow-premium">{state === 'loading' ? <Spinner className="mx-auto h-10 w-10 text-accent" /> : state === 'success' ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <XCircle className="mx-auto h-12 w-12 text-red-600" />}<div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent"><Mail className="mr-2 inline h-3.5 w-3.5" />Newsletter confirmation</div><h1 className="mt-3 text-2xl font-semibold">{state === 'loading' ? 'Confirming subscription' : state === 'success' ? 'Subscription confirmed' : 'Confirmation unavailable'}</h1><p className="mt-3 text-sm leading-6 text-foreground-muted">{message}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Return home</Link>{state === 'error' && <a href="/#newsletter" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold">Subscribe again</a>}</div></div></main></SiteLayout>;
}
