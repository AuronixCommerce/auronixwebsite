'use client';
import { Spinner } from '@/components/design/primitives';

import { FormEvent, useState } from 'react';
import { MailCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuronixMark } from '@/components/site/auronix-mark';
import { userFacingError } from '@/lib/user-facing-error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSent(false);

    try {
      const response = await fetch(
        '/api/auth/request-password-reset',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to process your request right now.'
        );
      }

      if (!data.success) {
        throw new Error(data.error || 'Auronix Auth could not accept the reset request.');
      }

      setSent(true);
    } catch (err) {
      console.error('Password reset request failed:', err);

      setError(
        userFacingError(
          err,
          'Auronix Auth could not process your request right now. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link
            href="/seller/login"
            className="inline-flex items-center gap-2"
          >
            <AuronixMark />

            <div className="text-left">
              <div className="text-sm font-semibold tracking-tight">
                AURONIX
              </div>

              <div className="text-[9px] uppercase tracking-[0.16em] text-foreground-muted">
                Commerce LLC
              </div>
            </div>
          </Link>
        </div>

        <div className="ac-content-panel p-8 shadow-premium-lg">
          {sent ? (
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <MailCheck className="w-7 h-7 text-green-600" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight mt-5">
                Check your email
              </h1>

              <p className="text-sm text-foreground-muted mt-3 leading-relaxed">
                If an Auronix account exists for that email address,
                a secure password-reset message has been requested.
              </p>

              <p className="text-xs text-foreground-muted mt-3">
                Allow a few minutes, then check your inbox and spam or junk folder.
              </p>

              <div className="mt-7 flex flex-col items-center gap-3">
                <Link
                  href="/seller/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium"
                >
                  Return to Seller Login
                </Link>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                >
                  Try again or use another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/seller/login"
                className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>

              <div className="mt-7">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Reset your password
                </h1>

                <p className="text-sm text-foreground-muted mt-2 leading-relaxed">
                  Enter the email associated with your Auronix account.
                  We'll send you a secure password-reset link.
                </p>
              </div>

              <form
                onSubmit={submit}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Sending reset link…
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
