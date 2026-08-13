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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { pushData, getTimestamp } from '@/lib/firebase-db';
import type { ContactMessage, ContactCategory } from '@/lib/types';
import { CONTACT_CATEGORIES, COMPANY } from '@/lib/constants';
import { CheckCircle2, ArrowRight, Loader2, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    category: '' as ContactCategory | '',
    message: '',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.category) e.category = 'Please select an inquiry category.';
    if (!form.message.trim()) e.message = 'Message is required.';
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
      const message: ContactMessage = {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        category: form.category as ContactCategory,
        message: form.message.trim(),
        status: 'new',
        createdAt: now,
        updatedAt: now,
      };

      await pushData('contactMessages', message as unknown as Record<string, unknown>);
      setSuccess(true);
      toast({ title: 'Message sent', description: 'We will be in touch soon.' });
    } catch (err) {
      toast({
        title: 'Failed to send',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: string) => {
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
            <h1 className="text-3xl font-semibold tracking-tight mb-4">Message sent.</h1>
            <p className="text-lg text-foreground-muted leading-relaxed mb-8">
              Thank you for reaching out to Auronix. We have received your message and will respond
              as soon as possible.
            </p>
            <Link href="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Contact"
        title={<>Let's talk.</>}
        description="Whether you are interested in partnering with Auronix, have a question about our services, or want to learn more, we would like to hear from you."
      />

      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Form */}
          <div className="lg:col-span-7">
            <Reveal>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Name" required error={errors.name}>
                    <Input
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Jane Doe"
                      aria-invalid={!!errors.name}
                    />
                  </FormField>
                  <FormField label="Company">
                    <Input
                      value={form.company}
                      onChange={(e) => update('company', e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </FormField>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Email" required error={errors.email}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="jane@acme.com"
                      aria-invalid={!!errors.email}
                    />
                  </FormField>
                  <FormField label="Phone">
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </FormField>
                </div>

                <FormField label="Inquiry Category" required error={errors.category}>
                  <Select
                    value={form.category}
                    onValueChange={(v) => update('category', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Message" required error={errors.message}>
                  <Textarea
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="How can we help?"
                    rows={6}
                    aria-invalid={!!errors.message}
                  />
                </FormField>

                <Button type="submit" disabled={submitting} size="lg">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Reveal>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-border bg-background-subtle p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 text-accent" />
                    Email
                  </div>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {COMPANY.email}
                  </a>
                </div>
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    Support
                  </div>
                  <p className="text-sm text-foreground-muted mb-3">
                    Need help with an existing partnership or account?
                  </p>
                  <Link href="/support">
                    <Button variant="outline" size="sm">
                      Visit Support
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
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
