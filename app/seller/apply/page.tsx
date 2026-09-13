'use client';
import { userFacingError } from '@/lib/user-facing-error';
import { Spinner } from '@/components/design/primitives';

import { FormEvent, useState, useId } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
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

type PreferredContact = 'business' | 'personal' | '';
type PolicyAgreement = true | false | null;

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
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [notificationPending, setNotificationPending] = useState(false);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setError('');
    setForm(current => ({ ...current, [field]: value }));


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
      const data = await draftRequest({ action: 'start', phone: form.phone });
      setDraftId(data.draftId); setResumeId(data.resumeId); setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (draftError) {
      setError(draftError instanceof Error ? userFacingError(draftError) : 'Progress could not be saved. Press Continue to retry.');
    } finally {
      setSavingDraft(false);
    }
  };

  const resumeApplication = async () => {
    setSavingDraft(true); setError('');
    try {
      const data = await draftRequest({ action: 'resume', resumeId: resumeInput });
      if (data.submitted) { setSubmittedId(data.trackingId); setAlreadySubmitted(true); setSubmitted(true); setResumeOpen(false); return; }
      setDraftId(data.draftId); setResumeId(data.resumeId); setStep(data.step || 1);
      setForm(current => ({ ...current, ...(data.form || {}) }));
      setEmailVerified(Boolean(data.emailVerified)); setResumeOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (resumeError) { setError(resumeError instanceof Error ? userFacingError(resumeError) : 'Unable to resume application.'); }
    finally { setSavingDraft(false); }
  };

  const saveStep = async (nextStep: number) => {
    if (!draftId || !resumeId) return;
    setSavingDraft(true); setError('');
    try { await draftRequest({ action: 'save', draftId, resumeId, form, step: nextStep }); setStep(nextStep); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (saveError) { setError(saveError instanceof Error ? userFacingError(saveError) : 'Unable to save this step.'); }
    finally { setSavingDraft(false); }
  };

  const selectedEmail = form.preferredContact === 'personal' ? form.personalEmail : form.preferredContact === 'business' ? form.businessEmail : '';
  const requestEmailCode = async () => {
    if (!form.preferredContact || !validEmail(selectedEmail)) { setError('Select personal or business email and enter a valid address.'); return; }
    setEmailBusy(true); setError('');
    try { await draftRequest({ action: 'email-request', draftId, resumeId, emailType: form.preferredContact, email: selectedEmail }); setEmailCodeSent(true); }
    catch (emailError) { setError(emailError instanceof Error ? userFacingError(emailError) : 'Unable to send email code.'); }
    finally { setEmailBusy(false); }
  };

  const verifyEmailCode = async () => {
    setEmailBusy(true); setError('');
    try { await draftRequest({ action: 'email-verify', draftId, resumeId, code: emailOtp }); setEmailVerified(true); setEmailOtp(''); }
    catch (emailError) { setError(emailError instanceof Error ? userFacingError(emailError) : 'Unable to verify email code.'); }
    finally { setEmailBusy(false); }
  };

  const copyResumeId = async () => { try { await navigator.clipboard.writeText(resumeId); setCopiedResume(true); window.setTimeout(() => setCopiedResume(false), 1800); } catch { setError(`Copy your resume ID manually: ${resumeId}`); } };

  const validateForm = (): string | null => {
    const required: Array<[string, string]> = [
      ['Full Name', form.fullName],
      ['Business Name', form.businessName],
      ['Phone', form.phone],
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
        body: JSON.stringify({ form, draftId, resumeId }),
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

      setSubmittedId(String(data.trackingId || data.applicationId || ''));
      setNotificationPending(data.emailSent === false);
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? userFacingError(submitError)
          : 'Unable to submit your application.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="ac-application">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-16">
          <div className="ac-content-panel w-full p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">APPLICATION RECEIVED</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{alreadySubmitted ? 'Your application is in progress.' : 'Thank you for applying.'}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-foreground-muted">
              Your seller application has been received successfully and will now go through the Auronix screening process.
            </p>
            {submittedId && <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-border bg-background p-4"><div className="text-xs uppercase tracking-wider text-foreground-muted">Tracking ID</div><div className="mt-1 break-all font-mono text-sm font-semibold">{submittedId}</div></div>}
            <p className="mt-5 text-sm text-foreground-muted">Your resume ID is now a tracking reference. Verify your application email to see progress, make available corrections, or contact support.</p>
            {notificationPending && <p role="status" className="mt-3 text-sm">Your application is saved. The confirmation email is delayed; save your tracking ID above.</p>}
            <Link className="ac-button mt-6" href={`/seller/application/track?id=${encodeURIComponent(submittedId)}`}>Track your application <ArrowRight size={18}/></Link>
            <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Return to Auronix
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-application">
      <div className="ac-application-layout ac-container">
        <aside className="ac-application-intro">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">SELLER PARTNERSHIPS</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Apply to work with Auronix.</h1>
          <p className="mt-5 text-base leading-7 text-foreground-muted sm:text-lg">
            Complete five secure steps. Every completed step is saved so you can return with your private resume ID.
          </p>
          <Link href="/seller/application/track" className="mt-5 inline-flex text-sm underline">Already submitted? Track your application</Link><ol className="ac-application-steps" aria-label="Application steps">{['Contact details','Verify email','Business information','Address & profile','Review & submit'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined} data-complete={step > i + 1}><span>{step > i + 1 ? <CheckCircle2 size={18}/> : String(i + 1).padStart(2, '0')}</span><strong>{label}</strong></li>)}</ol>
        </aside>

        <form onSubmit={submitApplication} className="ac-application-form space-y-6">
          <div className="ac-content-panel p-5 sm:p-6">
            <div className="ac-application-progress"><span>Step {step} of 5</span><progress aria-label="Application progress" value={step} max={5}/></div>
            {!draftId && <div className="mt-5 flex justify-center"><button type="button" onClick={() => { setError(''); setResumeOpen(true); }} className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent shadow-sm transition hover:-translate-y-0.5 hover:border-accent/45 hover:bg-accent/15 hover:shadow-md"><KeyRound className="h-4 w-4 transition-transform group-hover:-rotate-6" />Resume saved application<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button></div>}
            {resumeId && <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:flex-row"><div><div className="text-xs font-semibold uppercase tracking-wider text-accent">Private resume ID</div><div className="mt-1 font-mono text-sm font-bold">{resumeId}</div></div><button type="button" onClick={copyResumeId} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold"><Copy className="h-4 w-4" />{copiedResume ? 'Copied' : 'Copy ID'}</button></div>}
          </div>

          <Dialog open={resumeOpen && !draftId} onOpenChange={value => { if (!savingDraft) setResumeOpen(value); }}><DialogContent><DialogTitle>Continue your application</DialogTitle><DialogDescription>Enter your private resume ID to restore your saved details.</DialogDescription><label className="ac-field">Private resume ID<input value={resumeInput} onChange={event => { setError(''); setResumeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 11)); }} placeholder="AX-XXXXXXXX" autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} className="px-4" /></label>{error && <InlineError message={error}/>}<button type="button" onClick={resumeApplication} disabled={savingDraft || resumeInput.trim().length < 5} className="ac-button">{savingDraft ? <Spinner/> : <KeyRound size={18}/>}Resume application</button></DialogContent></Dialog>

          {step === 1 && <Section eyebrow="01" title="Contact details" description="Enter your phone number with country code to start your saved application.">
            <Field label="Phone" type="tel" required value={form.phone} onChange={value => updateField('phone', value)} placeholder="+1 555 000 0000" />
            {error && !resumeOpen && <InlineError message={error} />}
            <div className="mt-6 flex justify-end"><button type="button" onClick={createDraft} disabled={savingDraft || !/^\d{8,15}$/.test(form.phone.replace(/\D/g, ''))} className="ac-button">{savingDraft ? <Spinner className="h-4 w-4" /> : null}Continue <ArrowRight size={17} /></button></div>
          </Section>}

          {step === 2 && <Section eyebrow="02" title="Verify Your Email" description="Choose a personal or business email. We will send a secure six-digit code and your resume ID.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name" required value={form.fullName} onChange={value => updateField('fullName', value)} placeholder="John Smith" />
              <Field label="Business Email" type="email" value={form.businessEmail} onChange={value => updateField('businessEmail', value)} placeholder="john@company.com" />
              <Field label="Personal Email" type="email" value={form.personalEmail} onChange={value => updateField('personalEmail', value)} placeholder="johnsmith@gmail.com" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><RadioCard selected={form.preferredContact === 'business'} title="Verify business email" description={form.businessEmail || 'Enter business email above'} onSelect={() => updateField('preferredContact', 'business')} /><RadioCard selected={form.preferredContact === 'personal'} title="Verify personal email" description={form.personalEmail || 'Enter personal email above'} onSelect={() => updateField('preferredContact', 'personal')} /></div>
            {emailVerified ? <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-5"><CheckCircle2 className="h-6 w-6 text-green-600" /><div><div className="font-semibold text-green-700">Email verified</div><div className="text-sm text-foreground-muted">Your resume ID was also sent to {selectedEmail}.</div></div></div> : <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-5"><button type="button" onClick={requestEmailCode} disabled={emailBusy || !form.preferredContact || !validEmail(selectedEmail)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{emailBusy ? <Spinner className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{emailCodeSent ? 'Send New Code' : 'Send Email Code'}</button>{emailCodeSent && <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="Email verification code" autoComplete="one-time-code" value={emailOtp} onChange={event => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="000000" className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.35em]" /><button type="button" onClick={verifyEmailCode} disabled={emailBusy || emailOtp.length !== 6} className="rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">Verify Email</button></div>}</div>}
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
              disabled={submitting || !emailVerified}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[240px]"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Submitting...' : 'Submit Verified Application'}
            </button>
            <button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back to profile</button>
          </div>}
        </form>
      </div>
    </div>
  );
}

function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="ac-application-panel">
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
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true" className="ml-1 text-red-500">*</span>}</label>
      <input id={id} type={type} required={required} value={value} min={min} max={max} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
    </div>
  );
}

function TextAreaField({ label, required = false, value, onChange, placeholder, rows = 5 }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true" className="ml-1 text-red-500">*</span>}</label>
      <textarea id={id} required={required} value={value} onChange={event => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
    </div>
  );
}

function SelectField({ label, required = false, value, onChange, options }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; options: string[] }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true" className="ml-1 text-red-500">*</span>}</label>
      <div className="relative">
        <select id={id} required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-12 w-full appearance-none rounded-xl border border-border bg-background px-4 pr-10 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20">
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
