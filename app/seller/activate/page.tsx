'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SellerActivatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This invitation link is missing its invitation token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/seller/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to create seller account.'
        );
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/seller/login');
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create seller account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">
                A
              </span>
            </div>

            <div className="text-left">
              <div className="text-sm font-semibold">AURONIX</div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-foreground-muted">
                Commerce LLC
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />

              <h1 className="text-xl font-semibold">
                Account created
              </h1>

              <p className="text-sm text-foreground-muted mt-2">
                Your seller account has been created.
                Redirecting to login…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Create your seller account
              </h1>

              <p className="text-sm text-foreground-muted mt-2">
                Your Auronix Commerce seller application has been approved.
              </p>

              {!token && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-700 p-4 text-sm flex gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>
                    This invitation link is missing its token.
                  </span>
                </div>
              )}

              <form
                onSubmit={submit}
                className="mt-7 space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Create Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={8}
                    required
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 text-red-700 p-4 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    'Create Seller Account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/seller/login"
            className="text-sm text-foreground-muted hover:text-foreground"
          >
            Seller Login
          </Link>
        </div>
      </div>
    </div>
  );
}
