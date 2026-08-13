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
import type { SupplierSubmission } from '@/lib/types';
import { DISTRIBUTION_MODELS } from '@/lib/constants';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BecomeSupplierPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    categories: '',
    yearsInBusiness: '',
    distributionModel: '',
    catalogUrl: '',
    message: '',
    consent: false,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required.';
    if (!form.contactName.trim()) e.contactName = 'Contact name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    if (!form.categories.trim()) e.categories = 'Product categories are required.';
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
      const submission: SupplierSubmission = {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim() || undefined,
        country: form.country.trim() || undefined,
        categories: form.categories.trim(),
        yearsInBusiness: form.yearsInBusiness || undefined,
        distributionModel: form.distributionModel || undefined,
        catalogUrl: form.catalogUrl.trim() || undefined,
        message: form.message.trim() || undefined,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      };

      await pushData('suppliers', submission as unknown as Record<string, unknown>);
      setSuccess(true);
      toast({ title: 'Submission received', description: 'We will be in touch soon.' });
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
            <h1 className="text-3xl font-semibold tracking-tight mb-4">Submission received.</h1>
            <p className="text-lg text-foreground-muted leading-relaxed mb-8">
              Thank you for your interest in partnering with Auronix. We have received your
              information and will review it carefully. If there is a fit, we will be in touch soon.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button variant="outline">Return Home</Button>
              </Link>
              <Link href="/contact">
                <Button>
                  Contact Us
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Become a Supplier"
        title={<>Put your products in motion.</>}
        description="We are interested in connecting with legitimate suppliers, distributors, manufacturers, wholesalers, and quality brands. Tell us about your business."
      />

      <Section className="border-t border-border">
        <div className="max-w-2xl">
          <Reveal>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company info */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Company Name" required error={errors.companyName}>
                  <Input
                    value={form.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                    placeholder="Acme Manufacturing"
                    aria-invalid={!!errors.companyName}
                  />
                </FormField>
                <FormField label="Contact Name" required error={errors.contactName}>
                  <Input
                    value={form.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                    placeholder="Jane Doe"
                    aria-invalid={!!errors.contactName}
                  />
                </FormField>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Business Email" required error={errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="jane@acme.com"
                    aria-invalid={!!errors.email}
                  />
                </FormField>
                <FormField label="Phone" required error={errors.phone}>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    aria-invalid={!!errors.phone}
                  />
                </FormField>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Website">
                  <Input
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://acme.com"
                  />
                </FormField>
                <FormField label="Country">
                  <Input
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                    placeholder="United States"
                  />
                </FormField>
              </div>

              <FormField label="Product Categories" required error={errors.categories}>
                <Input
                  value={form.categories}
                  onChange={(e) => update('categories', e.target.value)}
                  placeholder="Home goods, electronics, apparel…"
                  aria-invalid={!!errors.categories}
                />
              </FormField>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Years in Business">
                  <Input
                    value={form.yearsInBusiness}
                    onChange={(e) => update('yearsInBusiness', e.target.value)}
                    placeholder="5"
                  />
                </FormField>
                <FormField label="Distribution Model">
                  <Select
                    value={form.distributionModel}
                    onValueChange={(v) => update('distributionModel', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRIBUTION_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField label="Catalog URL">
                <Input
                  value={form.catalogUrl}
                  onChange={(e) => update('catalogUrl', e.target.value)}
                  placeholder="https://acme.com/catalog"
                />
              </FormField>

              <FormField label="Message">
                <Textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Tell us about your products, capabilities, and what you are looking for in a partnership."
                  rows={5}
                />
              </FormField>

              {/* Consent */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={form.consent}
                  onCheckedChange={(v) => update('consent', v === true)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="consent" className="text-sm cursor-pointer">
                    I agree to be contacted by Auronix Commerce LLC regarding this submission.
                  </Label>
                  {errors.consent && (
                    <p className="text-sm text-destructive mt-1">{errors.consent}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Reveal>
        </div>
      </Section>
    </SiteLayout>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
