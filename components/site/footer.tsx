'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { AuronixMark } from '@/components/site/auronix-mark';

import {
  CheckCircle2,
  Loader2,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Twitter,
  Send,
} from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';

type PublicCompanySettings = {
  companyName?: string;
  footerDescription?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
};

function socialUrl(platform: 'whatsapp' | 'linkedin' | 'instagram' | 'facebook' | 'x', raw?: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
  }
  if (platform === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : '';
  }
  const handle = value.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  if (!handle || /[\s<>]/.test(handle)) return '';
  const bases = { linkedin: 'https://www.linkedin.com/', instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/', x: 'https://x.com/' };
  return `${bases[platform]}${handle}`;
}

export function Footer() {
  const [company, setCompany] = useState<PublicCompanySettings>({});
  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, 'site/settings/company'), snapshot => setCompany(snapshot.val() || {}), () => setCompany({}));
  }, []);

  const socials = [
    { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, value: company.whatsapp },
    { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, value: company.linkedin },
    { key: 'instagram' as const, label: 'Instagram', icon: Instagram, value: company.instagram },
    { key: 'facebook' as const, label: 'Facebook', icon: Facebook, value: company.facebook },
    { key: 'x' as const, label: 'X', icon: Twitter, value: company.x },
  ].map(item => ({ ...item, href: socialUrl(item.key, item.value) })).filter(item => item.href);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState(false);

  const subscribe = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      loading ||
      !email.trim()
    ) {
      return;
    }

    setLoading(
      true
    );

    setMessage(
      ''
    );

    setSuccess(
      false
    );

    try {
      const response =
        await fetch(
          '/api/newsletter/subscribe',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body:
              JSON.stringify({
                email:
                  email.trim(),
              }),

            cache:
              'no-store',
          }
        );

      const contentType =
        response.headers.get(
          'content-type'
        ) || '';

      let data:
        | {
            success?: boolean;
            alreadySubscribed?: boolean;
            confirmationRequired?: boolean;
            error?: string;
          }
        | null =
        null;

      if (
        contentType.includes(
          'application/json'
        )
      ) {
        data =
          await response.json();
      } else {
        const raw =
          await response.text();

        console.error(
          'Newsletter API returned non-JSON response:',
          raw
        );

        throw new Error(
          response.status ===
            404
            ? 'Newsletter service is unavailable. The API route was not found.'
            : `Newsletter service returned an unexpected response (${response.status}).`
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            'Unable to subscribe to the newsletter.'
        );
      }

      setSuccess(
        true
      );

      setMessage(
        data.alreadySubscribed
          ? 'You are already subscribed.'
          : data.confirmationRequired
            ? 'Check your email and confirm your subscription.'
            : 'You are now subscribed to Auronix Commerce updates.'
      );

      setEmail(
        ''
      );
    } catch (
      error
    ) {
      setSuccess(
        false
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to subscribe to the newsletter.'
      );
    } finally {
      setLoading(
        false
      );
    }
  };

  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* BRAND */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
              <AuronixMark />

              <span className="font-semibold tracking-tight">
                {company.companyName || 'Auronix Commerce LLC'}
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-foreground-muted">
              {company.footerDescription || 'Trusted eCommerce sourcing, supplier partnerships, and marketplace solutions.'}
            </p>

            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Auronix Commerce social profiles">
                {socials.map(item => { const Icon = item.icon; return <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`Auronix Commerce on ${item.label}`} title={item.label} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground-muted transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/10 hover:text-accent"><Icon className="h-4 w-4" /></a>; })}
              </div>
            )}
          </div>

          {/* COMPANY */}
          <div>
            <h3 className="text-sm font-semibold">
              Company
            </h3>

            <nav className="mt-4 space-y-3 text-sm text-foreground-muted">
              <Link
                href="/about"
                className="block hover:text-foreground"
              >
                About
              </Link>

              <Link
                href="/our-process"
                className="block hover:text-foreground"
              >
                Our Process
              </Link>

              <Link
                href="/why-work-with-us"
                className="block hover:text-foreground"
              >
                Why Work With Us
              </Link>

              <Link
                href="/company-verification"
                className="block hover:text-foreground"
              >
                Company Verification
              </Link>

              <Link
                href="/careers"
                className="block hover:text-foreground"
              >
                Careers
              </Link>

              <Link
                href="/blog"
                className="block hover:text-foreground"
              >
                Blog & Insights
              </Link>

              <Link
                href="/faq"
                className="block hover:text-foreground"
              >
                Frequently Asked Questions
              </Link>

              <Link
                href="/help"
                className="block hover:text-foreground"
              >
                Help & Troubleshooting
              </Link>
            </nav>
          </div>

          {/* SELLERS */}
          <div>
            <h3 className="text-sm font-semibold">
              Sellers & Partners
            </h3>

            <nav className="mt-4 space-y-3 text-sm text-foreground-muted">
              <Link
                href="/seller"
                className="block hover:text-foreground"
              >
                Seller Access
              </Link>

              <Link
                href="/seller/policy"
                className="block font-medium text-accent hover:underline"
              >
                Seller Policy
              </Link>

              <Link
                href="/supplier"
                className="block hover:text-foreground"
              >
                Become a Supplier
              </Link>

              <Link
                href="/partner-portal"
                className="block hover:text-foreground"
              >
                Partner Portal
              </Link>

              <Link
                href="/contact"
                className="block hover:text-foreground"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* LEGAL */}
          <div>
            <h3 className="text-sm font-semibold">
              Legal
            </h3>

            <nav className="mt-4 space-y-3 text-sm text-foreground-muted">
              <Link
                href="/privacy"
                className="block hover:text-foreground"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                className="block hover:text-foreground"
              >
                Terms of Service
              </Link>

              <Link
                href="/disclaimer"
                className="block hover:text-foreground"
              >
                Disclaimer
              </Link>

              <Link
                href="/cookie-policy"
                className="block hover:text-foreground"
              >
                Cookie Policy
              </Link>

              <button type="button" onClick={() => window.dispatchEvent(new Event('auronix:open-cookie-settings'))} className="block text-left hover:text-foreground">
                Cookie Settings
              </button>

              <Link
                href="/seller/policy"
                className="block font-medium text-accent hover:underline"
              >
                Seller Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* NEWSLETTER */}
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                <Mail className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold">
                  Stay updated
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground-muted">
                  Get Auronix Commerce news, website
                  updates, partnership announcements,
                  eCommerce insights, and important
                  policy changes.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                subscribe
              }
              className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl"
            >
              <input
                type="email"
                required
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />

              <button
                type="submit"
                disabled={
                  loading
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                {loading
                  ? 'Subscribing...'
                  : 'Subscribe'}
              </button>
            </form>
          </div>

          {message && (
            <div
              className={`mt-4 flex items-start gap-2 text-sm ${
                success
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}
            >
              {success && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}

              <span>
                {
                  message
                }
              </span>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-foreground-muted">
            You can <Link href="/newsletter/unsubscribe" className="font-medium text-accent underline decoration-accent/35 underline-offset-2 hover:decoration-accent">unsubscribe</Link> from newsletter emails at any time.
          </p>
        </div>

        {/* BOTTOM */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Auronix Commerce LLC.
            All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/seller"
              className="font-medium hover:text-foreground"
            >
              Seller Login or Apply
            </Link>

            <Link
              href="/seller/policy"
              className="font-medium text-accent hover:underline"
            >
              Seller Policy
            </Link>

            <Link
              href="/privacy"
              className="hover:text-foreground"
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              className="hover:text-foreground"
            >
              Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
