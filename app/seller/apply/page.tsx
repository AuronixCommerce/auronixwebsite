'use client';

import { useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { pushData, getTimestamp } from '@/lib/firebase-db';
import type { SellerApplication } from '@/lib/types';
import { BUSINESS_TYPES } from '@/lib/constants';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SellerApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    country: '',
    website: '',
    businessType: '',
    productCategories: '',
    yearsInBusiness: '',
    businessInformation: '',
    reason: '',
    catalogUrl: '',
    consent: false,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    if (!form.businessName.trim()) e.businessName = 'Business name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    if (!form.country.trim()) e.country = 'Country is required.';
    if (!form.businessType) e.businessType = 'Business type is required.';
    if (!form.productCategories.trim()) e.productCategories = 'Product categories are required.';
    if (!form.consent) e.consent = 'You must agree to be contacted.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const now = getTimestamp();
      const application: SellerApplication = {
        fullName: form.fullName.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        website: form.website.trim() || undefined,
        businessType: form.businessType,
        productCategories: form.productCategories.trim(),
        yearsInBusiness: form.yearsInBusiness || '',
        businessInformation: form.businessInformation.trim() || undefined,
        reason: form.reason.trim() || undefined,
        catalogUrl: form.catalogUrl.trim() || undefined,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await pushData('sellerApplications', application as unknown as Record<string, unknown>);
      setSuccess(true);
      toast({ title: 'Application submitted', description: 'We will review and respond soon.' });
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  if (success) {
    return (
      <SiteLayout>
        <Section className="min-h-[60vh] flex items-center">
          <Reveal className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-4">Application received.</h1>
            <p className="text-lg text-foreground-muted leading-relaxed mb-8">
              Thank you for your interest in becoming a seller with Auronix. We have received your application and will review it carefully. If approved, you will receive an invitation email to set up your account.
            </p>
            <Link href="/seller">
              <Button variant="outline">Return to Seller Portal</Button>
            </Link>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Seller Application"
        title={<>Apply to become a seller.</>}
        description="Tell us about your business. If approved, you will receive an invitation to create your seller account."
      />

      <Section className="border-t border-border">
        <div className="max-w-2xl">
          <Reveal>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Full Name" required error={errors.fullName}>
                  <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} aria-invalid={!!errors.fullName} />
                </FormField>
                <FormField label="Business Name" required error={errors.businessName}>
                  <Input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} aria-invalid={!!errors.businessName} />
                </FormField>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Business Email" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={!!errors.email} />
                </FormField>
                <FormField label="Phone" required error={errors.phone}>
                  <Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} aria-invalid={!!errors.phone} />
                </FormField>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Country" required error={errors.country}>
                  <Input value={form.country} onChange={(e) => update('country', e.target.value)} aria-invalid={!!errors.country} />
                </FormField>
                <FormField label="Website">
                  <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
                </FormField>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Business Type" required error={errors.businessType}>
                  <Select value={form.businessType} onValueChange={(v) => update('businessType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Years in Business">
                  <Input value={form.yearsInBusiness} onChange={(e) => update('yearsInBusiness', e.target.value)} placeholder="5" />
                </FormField>
              </div>

              <FormField label="Product Categories" required error={errors.productCategories}>
                <Input value={form.productCategories} onChange={(e) => update('productCategories', e.target.value)} placeholder="Electronics, home goods, apparel…" aria-invalid={!!errors.productCategories} />
              </FormField>

              <FormField label="Business Information">
                <Textarea value={form.businessInformation} onChange={(e) => update('businessInformation', e.target.value)} rows={4} placeholder="Tell us about your business, products, and capabilities." />
              </FormField>

              <FormField label="Why do you want to work with Auronix?">
                <Textarea value={form.reason} onChange={(e) => update('reason', e.target.value)} rows={3} placeholder="What are you looking for in a partnership?" />
              </FormField>

              <FormField label="Catalog URL">
                <Input value={form.catalogUrl} onChange={(e) => update('catalogUrl', e.target.value)} placeholder="https://" />
              </FormField>

              <div className="flex items-start gap-3">
                <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => update('consent', v === true)} className="mt-1" />
                <div>
                  <Label htmlFor="consent" className="text-sm cursor-pointer">
                    I agree to be contacted by Auronix Commerce LLC regarding my seller application.
                  </Label>
                  {errors.consent && <p className="text-sm text-destructive mt-1">{errors.consent}</p>}
                </div>
              </div>

              <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                ) : (
                  <>Submit Application<ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </Reveal>
        </div>
      </Section>
    </SiteLayout>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
