'use client';

import { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Clock3, Download, FileArchive, MessageSquareText, Send, ShieldCheck, UploadCloud } from 'lucide-react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { DealRoomGuide } from '@/components/deal-room/deal-room-guide';
import { Spinner } from '@/components/design/primitives';
import { auth } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';
import { userFacingError } from '@/lib/user-facing-error';
import Link from 'next/link';

const EMPTY = { brands: '', minimumOrderQuantity: '', pricingModel: '', currency: 'USD', leadTimeDays: '', incoterms: '', notes: '' };

async function request(path = '', init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Your seller session has expired. Please sign in again.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/seller/deal-room${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The Deal Room request could not be completed.');
  return data;
}

const date = (value: number) => value ? new Date(value).toLocaleString() : '—';
const statusTone = (value: string) => value === 'approved' ? 'text-emerald-700 bg-emerald-500/10' : value === 'rejected' || value === 'expired' ? 'text-rose-700 bg-rose-500/10' : 'text-amber-700 bg-amber-500/10';

export default function SellerDealRoomPage() {
  const [room, setRoom] = useState<any>(null);
  const [commercial, setCommercial] = useState<any>(EMPTY);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('catalog');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await request();
      setRoom(data.room); setCommercial({ ...EMPTY, ...(data.room?.commercial || {}) }); setError('');
    } catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to load the Deal Room.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => onAuthChange(user => { if (user) load(); else setLoading(false); }), [load]);
  const flash = (value: string) => { setNotice(value); window.setTimeout(() => setNotice(''), 3500); };

  const saveCommercial = async () => {
    setWorking('commercial'); setError('');
    try { await request('', { method: 'PATCH', body: JSON.stringify({ action: 'commercial', commercial }) }); flash('Commercial terms saved.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to save terms.'); }
    finally { setWorking(''); }
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    setWorking('message'); setError('');
    try { await request('', { method: 'POST', body: JSON.stringify({ action: 'message', message }) }); setMessage(''); flash('Message sent to the review team.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to send the message.'); }
    finally { setWorking(''); }
  };
  const upload = async () => {
    if (!file || !room?.applicationId) return;
    setWorking('upload'); setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const body = new FormData(); body.append('applicationId', room.applicationId); body.append('file', file); body.append('type', documentType); if (expiresAt) body.append('expiresAt', expiresAt);
      const response = await fetch('/api/deal-room/files', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setFile(null); setExpiresAt(''); flash('Document uploaded securely.'); await load();
    } catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to upload document.'); }
    finally { setWorking(''); }
  };
  const download = async (document: any) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/deal-room/files?applicationId=${encodeURIComponent(room.applicationId)}&documentId=${encodeURIComponent(document.id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Download failed.');
      const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; anchor.click(); URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to download document.'); }
  };

  const documents = room?.documents || [];
  const commercialReady = Boolean(
    commercial.brands &&
    commercial.minimumOrderQuantity &&
    commercial.pricingModel &&
    commercial.leadTimeDays
  );
  const hasDocuments = documents.length > 0;
  const needsReplacement = documents.some((document: any) => ['rejected', 'expired'].includes(document.status));
  const pendingDocuments = documents.filter((document: any) => document.status === 'pending').length;
  const latestMessage = room?.messages?.[room.messages.length - 1];
  const replyRequested = latestMessage?.senderRole === 'admin';
  const next = !room
    ? { text: 'Ask support to connect your approved application.', href: '/seller/support', label: 'Contact support' }
    : needsReplacement
      ? { text: 'Replace a rejected or expired document.', href: '#secure-documents', label: 'Review documents' }
      : !commercialReady
        ? { text: 'Complete the core commercial terms for review.', href: '#commercial-terms', label: 'Complete terms' }
        : !hasDocuments
          ? { text: 'Upload a catalog or brand authorization document.', href: '#secure-documents', label: 'Upload a file' }
          : replyRequested
            ? { text: 'The Auronix review team is waiting for your reply.', href: '#deal-room-messages', label: 'Reply now' }
            : pendingDocuments > 0
              ? { text: `${pendingDocuments} document${pendingDocuments === 1 ? ' is' : 's are'} awaiting review.`, href: '#review-timeline', label: 'View timeline' }
              : { text: 'Your room is current. Review the latest activity.', href: '#review-timeline', label: 'View activity' };

  return <SellerLayout><div className="ac-deal-room space-y-6">
    <header className="ac-workspace-hero"><div><span className="ac-eyebrow"><BriefcaseBusiness className="h-4 w-4" /> Partner Deal Room</span><h1>Commercial workspace</h1><p>Manage confidential supply terms, review documents, and talk directly with the Auronix team.</p></div>{room && <div className="ac-status-orb"><span>Application</span><strong>{String(room.status || 'active').replace(/_/g, ' ')}</strong><small>{room.applicationId}</small></div>}</header>
    {error && <div className="ac-alert ac-alert-error">{error}</div>}{notice && <div className="ac-alert ac-alert-success"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
    {!loading && <DealRoomGuide role="seller" nextAction={next.text} actionHref={next.href} actionLabel={next.label} checkpoints={room ? [
      { label: 'Commercial profile', complete: commercialReady },
      { label: 'Private document', complete: hasDocuments },
      { label: 'No replacement needed', complete: !needsReplacement },
      { label: 'Review reply current', complete: !replyRequested },
    ] : []} />}
    {loading ? <div className="ac-content-panel flex min-h-[320px] items-center justify-center"><Spinner className="h-7 w-7" /></div> : !room ? <div className="ac-content-panel p-8"><h2 className="text-xl font-semibold">Deal Room connection pending</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">The Deal Room appears after an approved application is linked to your seller account. If you were recently approved, refresh your dashboard first; otherwise ask support to connect the application.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/seller/dashboard" className="ac-button ac-button-secondary">Open dashboard</Link><Link href="/seller/support" className="ac-button">Contact support</Link></div></div> : <div className="ac-deal-grid">
      <div className="space-y-6">
        <section id="commercial-terms" className="ac-content-panel scroll-mt-28 p-6"><SectionHead icon={BriefcaseBusiness} title="Commercial terms" text="Keep MOQ, pricing, lead time, brand, and fulfillment details current." /><div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Brands represented" value={commercial.brands} onChange={(v) => setCommercial({ ...commercial, brands: v })} />
          <Field label="Minimum order quantity" value={commercial.minimumOrderQuantity} onChange={(v) => setCommercial({ ...commercial, minimumOrderQuantity: v })} />
          <Field label="Pricing model" value={commercial.pricingModel} onChange={(v) => setCommercial({ ...commercial, pricingModel: v })} />
          <Field label="Currency" value={commercial.currency} onChange={(v) => setCommercial({ ...commercial, currency: v })} />
          <Field label="Lead time (days)" type="number" value={commercial.leadTimeDays} onChange={(v) => setCommercial({ ...commercial, leadTimeDays: v })} />
          <Field label="Incoterms" value={commercial.incoterms} onChange={(v) => setCommercial({ ...commercial, incoterms: v })} />
        </div><label className="mt-4 block text-sm font-medium">Commercial notes<textarea className="mt-2 min-h-[110px] w-full rounded-2xl border border-border px-4 py-3" value={commercial.notes} onChange={(e) => setCommercial({ ...commercial, notes: e.target.value })} /></label><button className="ac-button mt-5" onClick={saveCommercial} disabled={!!working}>{working === 'commercial' ? <Spinner className="h-4 w-4" /> : null}Save commercial terms</button></section>
        <section id="secure-documents" className="ac-content-panel scroll-mt-28 p-6"><SectionHead icon={ShieldCheck} title="Secure documents" text="Catalogs, pricing files, compliance records, and brand authorizations remain private." /><div className="ac-upload-grid mt-6"><label className="ac-file-drop"><UploadCloud className="h-6 w-6" /><strong>{file ? file.name : 'Choose document'}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, image, CSV or spreadsheet · 12 MB max'}</span><input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><div className="grid gap-3"><select value={documentType} onChange={(e) => setDocumentType(e.target.value)}><option value="catalog">Product catalog</option><option value="brand-authorization">Brand authorization</option><option value="pricing">Pricing</option><option value="compliance">Compliance</option><option value="other">Other</option></select><input type="date" aria-label="Document expiry date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /><button className="ac-button" disabled={!file || !!working} onClick={upload}>{working === 'upload' ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}Upload securely</button></div></div>
          <div className="mt-6 grid gap-3">{room.documents.length ? room.documents.map((doc: any) => <div className="ac-document-row" key={doc.id}><FileArchive className="h-5 w-5" /><div><strong>{doc.name}</strong><span>{doc.type.replace(/-/g, ' ')} · {(doc.size / 1024 / 1024).toFixed(1)} MB · {date(doc.uploadedAt)}</span>{doc.reviewNote && <small>{doc.reviewNote}</small>}</div><span className={`ac-status-pill ${statusTone(doc.status)}`}>{doc.status}</span><button onClick={() => download(doc)} aria-label={`Download ${doc.name}`}><Download className="h-4 w-4" /></button></div>) : <Empty text="No private documents uploaded yet." />}</div>
        </section>
      </div>
      <aside className="space-y-6">
        <section id="deal-room-messages" className="ac-content-panel scroll-mt-28 p-5"><SectionHead icon={MessageSquareText} title="Application messages" text="Messages stay attached to this review." /><div className="ac-message-list mt-5">{room.messages.length ? room.messages.map((item: any) => <div key={item.id} className={`ac-message ${item.senderRole === 'seller' ? 'is-own' : ''}`}><span>{item.senderRole === 'admin' ? 'Auronix review team' : 'You'} · {date(item.createdAt)}</span><p>{item.body}</p></div>) : <Empty text="No messages yet." />}</div><textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-4 min-h-[92px] w-full rounded-2xl border border-border px-4 py-3" placeholder="Ask a question or add context…" /><button className="ac-button mt-3 w-full" onClick={sendMessage} disabled={!message.trim() || !!working}>{working === 'message' ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}Send message</button></section>
        <section id="review-timeline" className="ac-content-panel scroll-mt-28 p-5"><SectionHead icon={Clock3} title="Review timeline" text="A permanent history of decisions and requested edits." /><div className="ac-timeline mt-5">{room.timeline.length ? room.timeline.map((item: any) => <article key={item.id}><i /><div><strong>{item.title}</strong><time>{date(item.createdAt)}</time><p>{item.description}</p>{item.fieldChanges?.map((change: any) => <small key={change.field}>{change.label}: {change.before || 'Empty'} → {change.after || 'Empty'}</small>)}</div></article>) : <Empty text="Timeline events will appear here." />}</div></section>
      </aside>
    </div>}
  </div></SellerLayout>;
}

function SectionHead({ icon: Icon, title, text }: { icon: any; title: string; text: string }) { return <div className="flex items-start gap-3"><span className="ac-section-icon"><Icon className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-foreground-muted">{text}</p></div></div>; }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-medium">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border px-4" /></label>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-foreground-muted">{text}</p>; }
