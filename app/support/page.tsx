'use client';

import { useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section, SectionHeading } from '@/components/site/section';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { pushData, getTimestamp } from '@/lib/firebase-db';
import type { SupportTicket } from '@/lib/types';
import { TICKET_CATEGORIES } from '@/lib/constants';
import { CheckCircle2, ArrowRight, Loader2, LifeBuoy, Search, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.category) e.category = 'Please select a category.';
    if (!form.subject.trim()) e.subject = 'Subject is required.';
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
      const ticket: SupportTicket = {
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      await pushData('tickets', ticket as unknown as Record<string, unknown>);
      setSuccess(true);
      toast({ title: 'Ticket created', description: 'We will respond soon.' });
    } catch (err) {
      toast({
        title: 'Failed to create ticket',
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

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Support"
        title={<>How can we help?</>}
        description="Search our FAQ, contact support, or create a ticket. We are here to help with any questions or issues."
      />

      <Section className="border-t border-border">
        <div className="grid lg:grid-cols-3 gap-5">
          {/* FAQ link */}
          <Reveal>
            <Link href="/faq">
              <div className="group rounded-2xl border border-border bg-card p-8 h-full hover:shadow-premium-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                  <Search className="w-5 h-5 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">Search FAQ</h3>
                <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                  Find quick answers to common questions about Auronix, our services, and partnerships.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:gap-2 transition-all">
                  Browse FAQs
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </Reveal>

          {/* Contact link */}
          <Reveal delay={0.05}>
            <Link href="/contact">
              <div className="group rounded-2xl border border-border bg-card p-8 h-full hover:shadow-premium-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                  <LifeBuoy className="w-5 h-5 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">Contact Support</h3>
                <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                  Send us a message and we will get back to you as soon as possible.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:gap-2 transition-all">
                  Contact Us
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </Reveal>

          {/* Ticket dialog */}
          <Reveal delay={0.1}>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="text-left w-full">
                  <div className="group rounded-2xl border border-border bg-card p-8 h-full hover:shadow-premium-lg transition-all">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                      <Ticket className="w-5 h-5 text-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight mb-2">Create a Ticket</h3>
                    <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                      Submit a support ticket for detailed or account-specific issues.
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:gap-2 transition-all">
                      Open Ticket
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                </DialogHeader>
                {success ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Ticket created.</h3>
                    <p className="text-sm text-foreground-muted mb-6">
                      We have received your ticket and will respond soon.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccess(false);
                        setOpen(false);
                        setForm({ name: '', email: '', category: '', subject: '', message: '' });
                      }}
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField label="Name" required error={errors.name}>
                        <Input
                          value={form.name}
                          onChange={(e) => update('name', e.target.value)}
                          aria-invalid={!!errors.name}
                        />
                      </FormField>
                      <FormField label="Email" required error={errors.email}>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          aria-invalid={!!errors.email}
                        />
                      </FormField>
                    </div>
                    <FormField label="Category" required error={errors.category}>
                      <Select
                        value={form.category}
                        onValueChange={(v) => update('category', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Subject" required error={errors.subject}>
                      <Input
                        value={form.subject}
                        onChange={(e) => update('subject', e.target.value)}
                        aria-invalid={!!errors.subject}
                      />
                    </FormField>
                    <FormField label="Message" required error={errors.message}>
                      <Textarea
                        value={form.message}
                        onChange={(e) => update('message', e.target.value)}
                        rows={4}
                        aria-invalid={!!errors.message}
                      />
                    </FormField>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        <>
                          Create Ticket
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
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
