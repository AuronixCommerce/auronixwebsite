'use client';
import { Spinner } from '@/components/design/primitives';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageCircle,
  Mail,
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

const BUSINESS_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Brand',
  'Retailer',
  'Service Provider',
  'Other',
];

const AURONIX_WHATSAPP_NUMBER = '+1 548 578 9795';
const AURONIX_WHATSAPP_DIGITS = '15485789795';

type PreferredContact = 'business' | 'personal' | '';
type PolicyAgreement = true | false | null;
type VerificationStatus =
  | 'idle'
  | 'awaiting_whatsapp'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'failed';

interface FormState {
  fullName: string;
  businessName: string;
  businessEmail: string;
  personalEmail: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  businessType: string;
  yearsInBusiness: string;
  productCategories: string;
  businessInformation: string;
  whyWorkWithAuronix: string;
  catalogUrl: string;
  preferredContact: PreferredContact;
  contactAgreement: boolean;
  sellerPolicyAgreement: PolicyAgreement;
}

const INITIAL_FORM: FormState = {
  fullName: '',
  businessName: '',
  businessEmail: '',
  personalEmail: '',
  phone: '',
  country: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  website: '',
  businessType: '',
  yearsInBusiness: '',
  productCategories: '',
  businessInformation: '',
  whyWorkWithAuronix: '',
  catalogUrl: '',
  preferredContact: '',
  contactAgreement: false,
  sellerPolicyAgreement: null,
};

function clean(value: string): string {
  return value.trim();
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SellerApplyPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [verificationId, setVerificationId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [otp, setOtp] = useState('');
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [resumeInput, setResumeInput] = useState('');
  const [resumeOpen, setResumeOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setError('');
    setForm(current => ({ ...current, [field]: value }));

    if (field === 'phone') {
      setVerificationId('');
      setVerificationStatus('idle');
      setMaskedPhone('');
      setExpiresAt(0);
      setOtp('');
      setCopiedNumber(false);
    }
    if (field === 'businessEmail' || field === 'personalEmail' || field === 'preferredContact') {
      setEmailVerified(false);
      setEmailCodeSent(false);
      setEmailOtp('');
    }
  };

  const draftRequest = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/seller/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save application progress.');
    return data;
  };

  const createDraft = async () => {
    setSavingDraft(true); setError('');
    try {
      const data = await draftRequest({ action: 'start', verificationId, phone: form.phone });
      setDraftId(data.draftId); setResumeId(data.resumeId); setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Your number is verified, but progress could not be saved. Press Continue to retry.');
    } finally {
      setSavingDraft(false);
    }
  };

  const resumeApplication = async () => {
    setSavingDraft(true); setError('');
    try {
      const data = await draftRequest({ action: 'resume', resumeId: resumeInput });
      setDraftId(data.draftId); setResumeId(data.resumeId); setStep(data.step || 1);
      setForm(current => ({ ...current, ...(data.form || {}) }));
      setVerificationId(data.whatsappVerificationId || ''); setVerificationStatus(data.whatsappVerified ? 'verified' : 'idle');
      setEmailVerified(Boolean(data.emailVerified)); setResumeOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (resumeError) { setError(resumeError instanceof Error ? resumeError.message : 'Unable to resume application.'); }
    finally { setSavingDraft(false); }
  };

  const saveStep = async (nextStep: number) => {
    if (!draftId || !resumeId) return;
    setSavingDraft(true); setError('');
    try { await draftRequest({ action: 'save', draftId, resumeId, form, step: nextStep }); setStep(nextStep); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save this step.'); }
    finally { setSavingDraft(false); }
  };

  const selectedEmail = form.preferredContact === 'personal' ? form.personalEmail : form.preferredContact === 'business' ? form.businessEmail : '';
  const requestEmailCode = async () => {
    if (!form.preferredContact || !validEmail(selectedEmail)) { setError('Select personal or business email and enter a valid address.'); return; }
    setEmailBusy(true); setError('');
    try { await draftRequest({ action: 'email-request', draftId, resumeId, emailType: form.preferredContact, email: selectedEmail }); setEmailCodeSent(true); }
    catch (emailError) { setError(emailError instanceof Error ? emailError.message : 'Unable to send email code.'); }
    finally { setEmailBusy(false); }
  };

  const verifyEmailCode = async () => {
    setEmailBusy(true); setError('');
    try { await draftRequest({ action: 'email-verify', draftId, resumeId, code: emailOtp }); setEmailVerified(true); setEmailOtp(''); }
    catch (emailError) { setError(emailError instanceof Error ? emailError.message : 'Unable to verify email code.'); }
    finally { setEmailBusy(false); }
  };

  const copyResumeId = async () => { try { await navigator.clipboard.writeText(resumeId); setCopiedResume(true); window.setTimeout(() => setCopiedResume(false), 1800); } catch { setError(`Copy your resume ID manually: ${resumeId}`); } };

  const startVerification = async () => {
    if (!clean(form.phone)) {
      setError('Enter your WhatsApp number including the country code first.');
      return;
    }

    setError('');
    setRequestingVerification(true);
    setOtp('');

    try {
      const response = await fetch('/api/seller/whatsapp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to start WhatsApp verification.');
      }

      setVerificationId(String(data.verificationId || ''));
      setVerificationStatus('awaiting_whatsapp');
      setMaskedPhone(String(data.maskedPhone || form.phone));
      setExpiresAt(Number(data.expiresAt || 0));
    } catch (requestError) {
      setVerificationStatus('failed');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to start WhatsApp verification.'
      );
    } finally {
      setRequestingVerification(false);
    }
  };

  const copyAuronixNumber = async () => {
    try {
      await navigator.clipboard.writeText(AURONIX_WHATSAPP_NUMBER);
      setCopiedNumber(true);
      window.setTimeout(() => setCopiedNumber(false), 1800);
    } catch {
      setError(`Copy this WhatsApp number manually: ${AURONIX_WHATSAPP_NUMBER}`);
    }
  };

  const verifyOtp = async () => {
    if (!verificationId) {
      setError('Click Verify Number first.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP received from Auronix Commerce on WhatsApp.');
      return;
    }

    setError('');
    setVerifyingOtp(true);

    try {
      const response = await fetch('/api/seller/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          phone: form.phone,
          code: otp,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.status === 'expired') setVerificationStatus('expired');
        if (data.status === 'failed') setVerificationStatus('failed');
        throw new Error(data.error || 'Unable to verify OTP.');
      }

      setVerificationStatus('verified');
      setOtp('');
      await createDraft();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'Unable to verify WhatsApp OTP.'
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateForm = (): string | null => {
    const required: Array<[string, string]> = [
      ['Full Name', form.fullName],
      ['Business Name', form.businessName],
      ['WhatsApp Phone', form.phone],
      ['Country', form.country],
      ['Street Address', form.address],
      ['City', form.city],
      ['State / Province', form.state],
      ['ZIP / Postal Code', form.zipCode],
      ['Business Type', form.businessType],
      ['Product Categories', form.productCategories],
      ['Business Information', form.businessInformation],
      ['Why do you want to work with Auronix?', form.whyWorkWithAuronix],
    ];

    for (const [label, value] of required) {
      if (!clean(value)) return `${label} is required.`;
    }

    if (!form.preferredContact) return 'Please select your preferred contact email.';
    if (!validEmail(selectedEmail)) return 'Please enter and verify the selected contact email.';
    if (clean(form.businessEmail) && !validEmail(form.businessEmail)) return 'Please correct or remove the business email address.';
    if (clean(form.personalEmail) && !validEmail(form.personalEmail)) return 'Please correct or remove the personal email address.';
    if (clean(form.businessInformation).length < 30) return 'Please provide more detail in Business Information.';
    if (clean(form.whyWorkWithAuronix).length < 20) return 'Please explain why you want to work with Auronix.';
    if (form.sellerPolicyAgreement !== true) return 'You must agree to the Auronix Seller Policy.';
    if (!form.contactAgreement) return 'Please agree to be contacted by Auronix Commerce LLC.';
    if (verificationStatus !== 'verified' || !verificationId) return 'Verify your WhatsApp number before submitting.';
    if (!emailVerified || !draftId || !resumeId) return 'Verify your selected email before submitting.';

    if (clean(form.yearsInBusiness)) {
      const years = Number(clean(form.yearsInBusiness));
      if (!Number.isFinite(years) || years < 0 || years > 200) {
        return 'Years in Business must be between 0 and 200.';
      }
    }

    return null;
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, verificationId, draftId, resumeId }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'SELLER_ACCOUNT_EXISTS' || data.code === 'APPLICATION_ALREADY_EXISTS') {
          setStep(2);
          setEmailVerified(false);
          setEmailCodeSent(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        throw new Error(data.error || 'Unable to submit your application.');
      }

      setSubmittedId(String(data.applicationId || ''));
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit your application.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-16">
          <div className="w-full rounded-[32px] border border-border bg-card p-8 text-center shadow-xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">APPLICATION RECEIVED</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Thank you for applying.</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-foreground-muted">
              Your WhatsApp-verified seller application has been received successfully and will now go through the Auronix screening process.
            </p>
            {submittedId && <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-border bg-background p-4"><div className="text-xs uppercase tracking-wider text-foreground-muted">Application ID</div><div className="mt-1 break-all font-mono text-sm font-semibold">{submittedId}</div></div>}
            <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Return to Auronix
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const whatsappUrl = `https://wa.me/${AURONIX_WHATSAPP_DIGITS}?text=${encodeURIComponent('OTP')}`;
  const verificationStarted =
    verificationStatus === 'awaiting_whatsapp' || verificationStatus === 'pending';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">SELLER PARTNERSHIPS</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Apply to work with Auronix.</h1>
          <p className="mt-5 text-base leading-7 text-foreground-muted sm:text-lg">
            Complete five secure steps. Every completed step is saved so you can return with your private resume ID.
          </p>
        </div>

        <form onSubmit={submitApplication} className="mx-auto mt-12 max-w-4xl space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="grid grid-cols-5 gap-2">{['WhatsApp','Email','Business','Profile','Review'].map((label, index) => <div key={label} className="text-center"><div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step >= index + 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground-muted'}`}>{index + 1}</div><div className="mt-2 hidden text-[10px] font-medium sm:block">{label}</div></div>)}</div>
            {!draftId && <div className="mt-5 flex justify-center"><button type="button" onClick={() => { setError(''); setResumeOpen(true); }} className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent shadow-sm transition hover:-translate-y-0.5 hover:border-accent/45 hover:bg-accent/15 hover:shadow-md"><KeyRound className="h-4 w-4 transition-transform group-hover:-rotate-6" />Resume saved application<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button></div>}
            {resumeId && <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:flex-row"><div><div className="text-xs font-semibold uppercase tracking-wider text-accent">Private resume ID</div><div className="mt-1 font-mono text-sm font-bold">{resumeId}</div></div><button type="button" onClick={copyResumeId} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold"><Copy className="h-4 w-4" />{copiedResume ? 'Copied' : 'Copy ID'}</button></div>}
          </div>

          {resumeOpen && !draftId && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !savingDraft) setResumeOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="resume-application-title" className="w-full max-w-lg overflow-hidden rounded-t-[30px] border border-border bg-background shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:rounded-[30px]"><div className="relative border-b border-border bg-gradient-to-br from-accent/15 via-background to-background px-6 pb-6 pt-7 sm:px-8"><button type="button" onClick={() => setResumeOpen(false)} disabled={savingDraft} aria-label="Close resume application" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground-muted transition hover:bg-secondary hover:text-foreground disabled:opacity-50"><X className="h-4 w-4" /></button><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><KeyRound className="h-5 w-5" /></div><h2 id="resume-application-title" className="mt-5 text-2xl font-semibold tracking-tight">Continue your application</h2><p className="mt-2 max-w-md text-sm leading-6 text-foreground-muted">Enter the private resume ID sent to your verified email. We’ll securely restore your saved details and return you to the last completed step.</p></div><div className="space-y-4 px-6 py-6 sm:px-8"><label className="block"><span className="mb-2 block text-sm font-semibold">Private resume ID</span><input autoFocus value={resumeInput} onChange={event => { setError(''); setResumeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 11)); }} onKeyDown={event => { if (event.key === 'Enter' && resumeInput.trim() && !savingDraft) { event.preventDefault(); void resumeApplication(); } }} placeholder="AX-XXXXXXXX" autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} className="h-14 w-full rounded-2xl border border-border bg-secondary/30 px-4 font-mono text-base font-semibold uppercase tracking-wider outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:border-accent focus:ring-4 focus:ring-accent/10" /></label>{error && <InlineError message={error} />}<button type="button" onClick={resumeApplication} disabled={savingDraft || resumeInput.trim().length < 5} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50">{savingDraft ? <Spinner className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{savingDraft ? 'Restoring your application…' : 'Resume application'}</button><div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs leading-5 text-foreground-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Your resume ID is private. Auronix will never ask for your password to restore an application.</span></div></div></div></div>}

          {step === 1 && <Section eyebrow="01" title="Verify WhatsApp Number" description="Enter your number with country code, then verify it through Auronix WhatsApp.">
            <div className="mb-5 max-w-md"><Field label="WhatsApp Phone" required value={form.phone} onChange={value => updateField('phone', value)} placeholder="+1 555 000 0000" /></div>
            {verificationStatus === 'verified' ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-700">WhatsApp Number Verified</div>
                    <div className="mt-1 text-sm text-foreground-muted">{maskedPhone || form.phone} has been verified successfully.</div>
                  </div>
                </div>
                {!draftId && <button type="button" onClick={createDraft} disabled={savingDraft} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingDraft ? <Spinner className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{savingDraft ? 'Saving...' : 'Continue to Email Verification'}</button>}
              </div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-border bg-secondary/30 p-5 sm:p-6">
                {!verificationStarted && verificationStatus !== 'failed' && verificationStatus !== 'expired' && (
                  <>
                    <div className="flex items-start gap-3">
                      <MessageCircle className="mt-0.5 h-6 w-6 text-green-600" />
                      <div>
                        <div className="font-semibold">Verify your WhatsApp number</div>
                        <p className="mt-1 text-sm leading-6 text-foreground-muted">
                          Click Verify Number to create a secure WhatsApp verification request for the number entered above.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={startVerification}
                      disabled={requestingVerification || !clean(form.phone)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {requestingVerification ? <Spinner className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {requestingVerification ? 'Creating Verification...' : 'Verify Number'}
                    </button>
                  </>
                )}

                {verificationStarted && (
                  <>
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                        <div>
                          <div className="font-semibold">Verification code request generated on WhatsApp</div>
                          <p className="mt-2 text-sm leading-6 text-foreground-muted">
                            From the same WhatsApp number you entered ({maskedPhone}), message <strong>OTP</strong> to Auronix Commerce at <strong>{AURONIX_WHATSAPP_NUMBER}</strong>. Auronix will reply on WhatsApp with your 6-digit verification code.
                          </p>
                          <p className="mt-2 text-sm leading-6 text-foreground-muted">
                            You can copy the Auronix number or click Open WhatsApp below. The button opens WhatsApp with <strong>OTP</strong> already entered for you to send.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={copyAuronixNumber}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold transition hover:bg-secondary/40"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedNumber ? 'Number Copied' : `Copy ${AURONIX_WHATSAPP_NUMBER}`}
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Open WhatsApp & Get OTP
                      </a>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-5">
                      <label className="text-sm font-semibold">Enter OTP from WhatsApp</label>
                      <p className="mt-1 text-xs leading-5 text-foreground-muted">
                        After you message OTP to {AURONIX_WHATSAPP_NUMBER}, enter the 6-digit code Auronix replies with below.
                      </p>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otp}
                          onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.35em] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />

                        <button
                          type="button"
                          onClick={verifyOtp}
                          disabled={verifyingOtp || otp.length !== 6}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verifyingOtp ? <Spinner className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>

                      {expiresAt > 0 && (
                        <p className="mt-3 text-xs text-foreground-muted">
                          Verification request expires at {new Date(expiresAt).toLocaleTimeString()}.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {(verificationStatus === 'expired' || verificationStatus === 'failed') && (
                  <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700">
                    <p>This verification request is no longer active. Create a new request and message OTP from the same WhatsApp number.</p>
                    <button
                      type="button"
                      onClick={startVerification}
                      disabled={requestingVerification || !clean(form.phone)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {requestingVerification ? <Spinner className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Create New Verification
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && !resumeOpen && <InlineError message={error} />}
          </Section>}

          {step === 2 && <Section eyebrow="02" title="Verify Your Email" description="Choose a personal or business email. We will send a secure six-digit code and your resume ID.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name" required value={form.fullName} onChange={value => updateField('fullName', value)} placeholder="John Smith" />
              <Field label="Business Email" type="email" value={form.businessEmail} onChange={value => updateField('businessEmail', value)} placeholder="john@company.com" />
              <Field label="Personal Email" type="email" value={form.personalEmail} onChange={value => updateField('personalEmail', value)} placeholder="johnsmith@gmail.com" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><RadioCard selected={form.preferredContact === 'business'} title="Verify business email" description={form.businessEmail || 'Enter business email above'} onSelect={() => updateField('preferredContact', 'business')} /><RadioCard selected={form.preferredContact === 'personal'} title="Verify personal email" description={form.personalEmail || 'Enter personal email above'} onSelect={() => updateField('preferredContact', 'personal')} /></div>
            {emailVerified ? <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-5"><CheckCircle2 className="h-6 w-6 text-green-600" /><div><div className="font-semibold text-green-700">Email verified</div><div className="text-sm text-foreground-muted">Your resume ID was also sent to {selectedEmail}.</div></div></div> : <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-5"><button type="button" onClick={requestEmailCode} disabled={emailBusy || !form.preferredContact || !validEmail(selectedEmail)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{emailBusy ? <Spinner className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{emailCodeSent ? 'Send New Code' : 'Send Email Code'}</button>{emailCodeSent && <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={emailOtp} onChange={event => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="000000" className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.35em]" /><button type="button" onClick={verifyEmailCode} disabled={emailBusy || emailOtp.length !== 6} className="rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">Verify Email</button></div>}</div>}
            {error && <InlineError message={error} />}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => saveStep(3)} disabled={!emailVerified || savingDraft || !clean(form.fullName)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue <ArrowRight className="h-4 w-4" /></button></div>
          </Section>}

          {step === 3 && <Section eyebrow="03" title="Business Information" description="Tell us about your company and business activity.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Business Name" required value={form.businessName} onChange={value => updateField('businessName', value)} placeholder="Your Business LLC" />
              <SelectField label="Business Type" required value={form.businessType} onChange={value => updateField('businessType', value)} options={BUSINESS_TYPES} />
              <Field label="Years in Business" type="number" min="0" max="200" value={form.yearsInBusiness} onChange={value => updateField('yearsInBusiness', value)} placeholder="5" />
              <Field label="Website" type="url" value={form.website} onChange={value => updateField('website', value)} placeholder="https://example.com" />
            </div>
            <div className="mt-5">
              <Field label="Product Categories" required value={form.productCategories} onChange={value => updateField('productCategories', value)} placeholder="Home & Kitchen, Electronics, Office Products" />
            </div>
            {error && <InlineError message={error} />}
            <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" onClick={() => saveStep(4)} disabled={savingDraft || !clean(form.businessName) || !clean(form.businessType) || !clean(form.productCategories)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Save & Continue <ArrowRight className="h-4 w-4" /></button></div>
          </Section>}

          {step === 4 && <><Section eyebrow="04" title="Business Address & Profile" description="Provide the primary business address and information used for review.">
            <Field label="Country" required value={form.country} onChange={value => updateField('country', value)} placeholder="United States" />
            <div className="mt-5">
            <Field label="Street Address" required value={form.address} onChange={value => updateField('address', value)} placeholder="123 Market Street, Suite 200" />
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <Field label="City" required value={form.city} onChange={value => updateField('city', value)} placeholder="Miami" />
              <Field label="State / Province" required value={form.state} onChange={value => updateField('state', value)} placeholder="Florida" />
              <Field label="ZIP / Postal Code" required value={form.zipCode} onChange={value => updateField('zipCode', value)} placeholder="33101" />
            </div>

            <TextAreaField label="Business Information" required value={form.businessInformation} onChange={value => updateField('businessInformation', value)} rows={8} placeholder="Tell us about your business, products, customers, sourcing, distribution, operations, and commercial capabilities." />
            <div className="mt-5">
              <TextAreaField label="Why do you want to work with Auronix?" required value={form.whyWorkWithAuronix} onChange={value => updateField('whyWorkWithAuronix', value)} rows={6} placeholder="Explain what type of partnership you are seeking with Auronix Commerce LLC." />
            </div>
            <div className="mt-5">
              <Field label="Catalog URL" type="url" value={form.catalogUrl} onChange={value => updateField('catalogUrl', value)} placeholder="https://example.com/catalog" />
            </div>
            {error && <InlineError message={error} />}
            <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" onClick={() => saveStep(5)} disabled={savingDraft || !clean(form.country) || !clean(form.address) || !clean(form.city) || !clean(form.state) || !clean(form.zipCode) || clean(form.businessInformation).length < 30 || clean(form.whyWorkWithAuronix).length < 20} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Save & Review <ArrowRight className="h-4 w-4" /></button></div>
          </Section></>}

          {step === 5 && <Section eyebrow="05" title="Review & Agreements" description="Review the seller policy, accept the agreements, and submit your verified application.">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5">
              <div className="flex items-start gap-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-semibold">Auronix Seller Policy</div>
                  <p className="mt-1 text-sm leading-6 text-foreground-muted">Review seller eligibility, product requirements, application screening, and seller responsibilities.</p>
                  <Link href="/seller/policy" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                    Read Seller Policy <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <RadioCard selected={form.sellerPolicyAgreement === true} title="Yes, I agree" description="I have read and agree to the Auronix Seller Policy." onSelect={() => updateField('sellerPolicyAgreement', true)} name="sellerPolicy" />
              <RadioCard selected={form.sellerPolicyAgreement === false} title="No, I do not agree" description="You cannot submit without agreeing." onSelect={() => updateField('sellerPolicyAgreement', false)} name="sellerPolicy" />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-5">
              <input type="checkbox" checked={form.contactAgreement} onChange={event => updateField('contactAgreement', event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span className="text-sm leading-6 text-foreground-muted">I agree to be contacted by Auronix Commerce LLC regarding my seller application. <span className="text-red-500">*</span></span>
            </label>
            {error && <InlineError message={error} />}
          </Section>}

          {step === 5 && <div className="flex flex-col items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting || verificationStatus !== 'verified'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
            >
              {submitting ? <Spinner className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Submitting...' : 'Submit Verified Application'}
            </button>
            <button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back to profile</button>
          </div>}
        </form>
      </div>
    </main>
  );
}

function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-foreground-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  return <div role="alert" aria-live="polite" className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm leading-6 text-red-700 dark:text-red-300">{message}</div>;
}

function Field({ label, required = false, type = 'text', value, onChange, placeholder, min, max }: { label: string; required?: boolean; type?: string; value: string; onChange: (value: string) => void; placeholder?: string; min?: string; max?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      <input type={type} required={required} value={value} min={min} max={max} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
    </div>
  );
}

function TextAreaField({ label, required = false, value, onChange, placeholder, rows = 5 }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      <textarea required={required} value={value} onChange={event => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
    </div>
  );
}

function SelectField({ label, required = false, value, onChange, options }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      <div className="relative">
        <select required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-12 w-full appearance-none rounded-xl border border-border bg-background px-4 pr-10 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20">
          <option value="">Select type</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-8 h-4 w-4 text-foreground-muted" />
      </div>
    </div>
  );
}

function RadioCard({ selected, title, description, onSelect, name = 'preferredContact' }: { selected: boolean; title: string; description: string; onSelect: () => void; name?: string }) {
  return (
    <label className={`cursor-pointer rounded-xl border p-4 transition ${selected ? 'border-accent bg-accent/5' : 'border-border bg-background hover:bg-secondary/30'}`}>
      <div className="flex items-start gap-3">
        <input type="radio" name={name} checked={selected} onChange={onSelect} className="mt-1 h-4 w-4 accent-primary" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 break-all text-xs leading-5 text-foreground-muted">{description}</div>
        </div>
      </div>
    </label>
  );
}
