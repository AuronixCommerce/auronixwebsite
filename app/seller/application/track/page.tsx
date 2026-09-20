'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mail, Pencil, ShieldCheck, MessageCircle } from 'lucide-react';
import { Spinner } from '@/components/design/primitives';
import { userFacingError } from '@/lib/user-facing-error';

type Application = { trackingId: string; status: string; createdAt: number; updatedAt: number; reviewMessage: string; requestedFields?: string[]; revision?: number; canEdit: boolean; form: Record<string, string> };
const labels: Record<string, string> = { fullName: 'Full name', businessName: 'Business name', phone: 'Phone', country: 'Country', address: 'Street address', city: 'City', state: 'State / Province', zipCode: 'ZIP / Postal code', website: 'Website', businessType: 'Business type', yearsInBusiness: 'Years in business', productCategories: 'Product categories', businessInformation: 'Business information', whyWorkWithAuronix: 'Why do you want to work with Auronix?', catalogUrl: 'Catalog URL' };
const statuses: Record<string, string> = { pending: 'Submitted · In progress', screening: 'In review', under_review: 'In review', changes_requested: 'Action required', approved: 'Approved', invited: 'Invitation sent', active: 'Account activated', rejected: 'Review completed', archived: 'Application closed', suspended: 'Account review' };

export default function ApplicationTrackingPage() {
  const [trackingId, setTrackingId] = useState('');
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState('business');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setTrackingId(new URLSearchParams(window.location.search).get('id') || ''); }, []);
  async function request(body: Record<string, unknown>) {
    const response = await fetch('/api/seller/application/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401) { setToken(''); setApplication(null); setChallengeId(''); } throw new Error(data.error || 'Unable to load application tracking.'); }
    return data;
  }
  async function load(sessionToken: string) {
    const data = await request({ action: 'status', token: sessionToken });
    setApplication(data.application); setEmail(data.verifiedEmail); return data.application as Application;
  }
  useEffect(() => {
    if (!token || editing) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(token).catch(e => setError(userFacingError(e))); }, 30000);
    return () => window.clearInterval(timer);
    // The session token is memory-only. Opening another tab requires email verification again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, editing]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
    try {
      if (!challengeId) { const data = await request({ action: 'request-code', trackingId, email, emailType }); setChallengeId(data.challengeId); setNotice(data.message); }
      else { const data = await request({ action: 'verify-code', challengeId, code }); setToken(data.token); await load(data.token); setCode(''); }
    } catch (e) { setError(userFacingError(e)); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const data = await request({ action: 'edit', token, form }); setApplication(data.application); setEditing(false); setNotice('Your corrections were saved and submitted for review.'); }
    catch (e) { setError(userFacingError(e)); } finally { setBusy(false); }
  }
  function prepareSupport(ai = false) {
    if (!application) return;
    const message = `Please help with my seller application ${application.trackingId}. Current status: ${statuses[application.status] || 'In progress'}.${application.reviewMessage ? ` Review request: ${application.reviewMessage}` : ''}`;
    try { sessionStorage.setItem(ai ? 'auronix-application-ai' : 'auronix-application-contact', JSON.stringify({ expiresAt: Date.now() + 10 * 60_000, name: application.form.fullName, company: application.form.businessName, email, phone: application.form.phone, category: 'Support', subject: `Seller application ${application.trackingId}`, message })); } catch { setError('Your browser could not prefill the support form. Include your tracking ID in the message.'); }
  }
  return <div className="ac-application"><div className="ac-application-layout mx-auto max-w-6xl px-5">
    <aside className="ac-application-intro"><span className="ac-eyebrow">Seller application</span><h1 className="mt-4 text-4xl font-semibold tracking-tight">Your next step,<br/>always in view.</h1><p className="mt-5 text-foreground-muted">Track your review, respond to requests and contact Auronix from one place.</p><p className="mt-6 flex items-center gap-2 text-sm"><ShieldCheck size={18}/> Protected by Auronix Auth</p><Link className="mt-6 inline-flex text-sm underline" href="/seller/apply">Start or resume an application</Link></aside>
    <section className="ac-application-panel min-w-0" aria-label="Application tracking">
      <h2 className="text-2xl font-semibold">{application ? 'Application progress' : challengeId ? 'Verify your email' : 'Track your application'}</h2>
      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm">{notice}</p>}
      {!application ? <form onSubmit={submit} className="mt-6 space-y-5">
        {!challengeId ? <><label className="ac-field">Tracking ID<input required value={trackingId} onChange={e => setTrackingId(e.target.value.trim())} placeholder="AX-T-…" autoComplete="off" maxLength={128} className="w-full px-4"/></label><label className="ac-field">Email type<select value={emailType} onChange={e => setEmailType(e.target.value)} className="w-full px-4"><option value="business">Business email</option><option value="personal">Personal email</option></select></label><label className="ac-field">Application email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full px-4"/></label><p className="text-sm text-foreground-muted">Enter the selected email exactly as it appears on your application. We will send a verification code only when the details match.</p></> : <><p className="text-sm text-foreground-muted">Check {email} for your six-digit code.</p><label className="ac-field">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))} pattern="[0-9]{6}" maxLength={6} className="w-full px-4 text-center tracking-widest"/></label><button type="button" className="text-sm underline" onClick={() => { setChallengeId(''); setCode(''); setNotice(''); }}>Change details or request a new code</button></>}
        <button className="ac-button w-full" disabled={busy}>{busy ? <Spinner/> : <Mail size={18}/>} {challengeId ? 'Verify & view application' : 'Send verification code'}</button>
      </form> : <div className="mt-6 space-y-6"><div className="rounded-2xl border border-border p-5"><p className="text-xs uppercase tracking-wider text-foreground-muted">Tracking ID</p><p className="mt-2 break-all font-mono text-sm">{application.trackingId}</p><h3 className="mt-5 flex items-center gap-2 text-lg font-semibold"><CheckCircle2 size={20}/>{statuses[application.status] || 'In progress'}</h3><p className="mt-2 text-sm text-foreground-muted">Submitted {new Date(application.createdAt).toLocaleDateString()}. Updates appear here automatically.</p></div>
        {application.reviewMessage && <div className="rounded-2xl border border-amber-500/30 p-5"><h3 className="font-semibold">A message from the review team</h3><p className="mt-2 whitespace-pre-wrap text-sm">{application.reviewMessage}</p>{application.requestedFields?.length ? <div className="mt-4 flex flex-wrap gap-2">{application.requestedFields.map(field => <span key={field} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800">{labels[field] || field}</span>)}</div> : null}</div>}
        {editing ? <form onSubmit={save} className="space-y-4"><h3 className="font-semibold">Correct your application</h3><p className="text-sm text-foreground-muted">Your original email and consent remain unchanged. Contact support to change the email address.</p><div className="grid gap-4 sm:grid-cols-2">{Object.entries(labels).map(([key,label]) => <label className={`ac-field ${['businessInformation','whyWorkWithAuronix'].includes(key) ? 'sm:col-span-2' : ''}`} key={key}>{label}{['businessInformation','whyWorkWithAuronix'].includes(key) ? <textarea className="w-full px-4" rows={5} required minLength={key==='businessInformation'?30:20} value={form[key] || ''} onChange={e => setForm(v => ({...v,[key]:e.target.value}))}/> : <input className="w-full px-4" required={!['website','yearsInBusiness','catalogUrl'].includes(key)} value={form[key] || ''} onChange={e => setForm(v => ({...v,[key]:e.target.value}))}/>}</label>)}</div><div className="flex flex-wrap gap-3"><button className="ac-button" disabled={busy}>{busy?<Spinner/>:<CheckCircle2 size={18}/>}Save corrections</button><button type="button" className="ac-button ac-button-secondary" onClick={() => setEditing(false)}>Cancel</button></div></form> : <><p className="text-sm">{application.canEdit ? 'Need to correct something? Update your information before review continues.' : 'The team is reviewing or has completed this application. Contact support if a correction is needed.'}</p>{application.canEdit && <button className="ac-button" onClick={() => { setForm(application.form); setEditing(true); setNotice(''); }}><Pencil size={18}/>Edit application</button>}</>}
        <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2"><Link href="/support/chat?from=application" onClick={() => prepareSupport(true)} className="ac-button ac-button-secondary"><MessageCircle size={18}/>Chat with Auronix AI</Link><Link href="/contact?from=application" onClick={() => prepareSupport()} className="ac-button ac-button-secondary"><ArrowRight size={18}/>Contact support</Link><Link href="/support/contact?from=application" onClick={() => prepareSupport()} className="ac-button ac-button-secondary sm:col-span-2">Submit a support request</Link></div>
        <button className="text-sm underline" onClick={async () => { try { await request({ action: 'logout', token }); } catch {} setToken(''); setApplication(null); setChallengeId(''); setNotice(''); }}>Close secure tracking session</button>
      </div>}
    </section>
  </div></div>;
}
