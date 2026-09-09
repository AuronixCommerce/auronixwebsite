'use client';
import { Spinner } from '@/components/design/primitives';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { SiteLayout } from '@/components/site/site-layout';

const REASONS = [
  { value: 'too_many_emails', label: 'I receive emails too often' },
  { value: 'not_relevant', label: 'The content is not relevant to me' },
  { value: 'content_quality', label: 'The content did not meet my expectations' },
  { value: 'never_signed_up', label: 'I do not remember subscribing' },
  { value: 'privacy_concerns', label: 'I have privacy concerns' },
  { value: 'other', label: 'Another reason' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function NewsletterUnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const requestEmail = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/newsletter/unsubscribe/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send unsubscribe email.');
      setEmailSent(true);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to send unsubscribe email.'); }
    finally { setBusy(false); }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) { setError('Please select a reason so we can improve.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/newsletter/unsubscribe/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email, code, reason, otherReason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to unsubscribe this email.');
      setComplete(true);
    } catch (confirmError) { setError(confirmError instanceof Error ? confirmError.message : 'Unable to unsubscribe this email.'); }
    finally { setBusy(false); }
  };

  return <SiteLayout><main className="min-h-[72vh] bg-background px-5 py-16 text-foreground sm:py-24"><div className="mx-auto max-w-xl"><div className="mb-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center ac-content-panel shadow-sm"><Mail className="h-5 w-5 text-accent" /></div><div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Email preferences</div><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Unsubscribe from newsletters</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-foreground-muted">You can stop Auronix Commerce newsletter emails securely. Transactional account and security messages are not affected.</p></div>
  {complete ? <div className="rounded-[28px] border border-green-500/25 bg-card p-8 text-center shadow-premium"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><h2 className="mt-5 text-2xl font-semibold">You’re unsubscribed</h2><p className="mt-3 text-sm leading-6 text-foreground-muted">Your preference has been saved. You will no longer receive Auronix Commerce newsletters at this address.</p><Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Return home <ArrowRight className="h-4 w-4" /></Link></div> : !token && !emailSent ? <form onSubmit={requestEmail} className="rounded-[28px] border border-border bg-card p-6 shadow-premium sm:p-8"><label className="block"><span className="mb-2 block text-sm font-semibold">Subscribed email address</span><input type="email" required value={email} onChange={event => { setEmail(event.target.value); setError(''); }} autoComplete="email" placeholder="you@company.com" className="h-13 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" /></label>{error && <ErrorMessage message={error} />}<button type="submit" disabled={busy || !email.trim()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Spinner className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{busy ? 'Sending confirmation…' : 'Email unsubscribe link'}</button><div className="mt-5 flex items-start gap-2 text-xs leading-5 text-foreground-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>For privacy, the confirmation message is the same whether or not the address is currently subscribed.</span></div></form> : <form onSubmit={confirm} className="rounded-[28px] border border-border bg-card p-6 shadow-premium sm:p-8">{!token && <div className="mb-6 rounded-2xl border border-green-500/25 bg-green-500/5 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /><div><div className="font-semibold text-green-700 dark:text-green-300">Unsubscribe email sent</div><p className="mt-1 text-sm leading-6 text-foreground-muted">Check your inbox and click the button, or enter the six-digit code below.</p></div></div></div>}{!token && <label className="mb-6 block"><span className="mb-2 block text-sm font-semibold">Confirmation code</span><input value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.32em] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" /></label>}<fieldset><legend className="text-lg font-semibold">Before you go, what could we improve?</legend><p className="mt-1 text-sm text-foreground-muted">Your answer is optional to our relationship, but selecting one option helps us improve.</p><div className="mt-4 space-y-2">{REASONS.map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${reason === option.value ? 'border-accent bg-accent/5' : 'border-border hover:bg-secondary/40'}`}><input type="radio" name="reason" value={option.value} checked={reason === option.value} onChange={() => { setReason(option.value); setError(''); }} className="mt-1 accent-current" /><span className="text-sm leading-6">{option.label}</span></label>)}</div></fieldset>{reason === 'other' && <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold">Tell us what happened</span><textarea value={otherReason} onChange={event => { setOtherReason(event.target.value.slice(0, 1000)); setError(''); }} rows={4} placeholder="Share any detail that would help us improve…" className="w-full resize-y rounded-2xl border border-border bg-background p-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10" /></label>}{error && <ErrorMessage message={error} />}<button type="submit" disabled={busy || !reason || (!token && code.length !== 6)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy && <Spinner className="h-4 w-4 animate-spin" />}{busy ? 'Saving preference…' : 'Confirm unsubscribe'}</button>{!token && <button type="button" onClick={() => { setEmailSent(false); setCode(''); setError(''); }} disabled={busy} className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-foreground-muted hover:text-foreground">Use another email</button>}</form>}</div></main></SiteLayout>;
}

function ErrorMessage({ message }: { message: string }) {
  return <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">{message}</div>;
}
