'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const oobCode = searchParams.get('oobCode') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [valid, setValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const verifyCode = async () => {
      if (!oobCode) {
        if (!cancelled) {
          setError(
            'This password reset link is missing its reset code.'
          );
          setLoading(false);
        }

        return;
      }

      try {
        const accountEmail =
          await verifyPasswordResetCode(
            auth,
            oobCode
          );

        if (cancelled) return;

        setEmail(accountEmail);
        setValid(true);
      } catch (err) {
        console.error(
          'Password reset verification failed:',
          err
        );

        if (!cancelled) {
          setError(
            'This password reset link is invalid, expired, or has already been used.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    verifyCode();

    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    if (!oobCode || !valid) {
      setError(
        'This password reset link is no longer valid.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      await confirmPasswordReset(
        auth,
        oobCode,
        password
      );

      setSuccess(true);

      window.setTimeout(() => {
        router.push('/seller/login');
      }, 2200);
    } catch (err) {
      console.error(
        'Password reset failed:',
        err
      );

      setError(
        'Unable to reset the password. The reset link may have expired or already been used.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">
                A
              </span>
            </div>

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

        <div className="rounded-2xl border border-border bg-card p-8">
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-7 h-7 animate-spin mx-auto" />

              <p className="text-sm text-foreground-muted mt-3">
                Verifying reset link…
              </p>
            </div>
          ) : success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />

              <h1 className="text-xl font-semibold">
                Password updated
              </h1>

              <p className="text-sm text-foreground-muted mt-2">
                Your password has been changed successfully.
                Redirecting to seller login…
              </p>
            </div>
          ) : !valid ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />

              <h1 className="text-xl font-semibold">
                Reset link invalid
              </h1>

              <p className="text-sm text-foreground-muted mt-2">
                {error ||
                  'This password reset link is no longer valid.'}
              </p>

              <Link
                href="/seller/login"
                className="inline-flex mt-6 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium"
              >
                Back to Seller Login
              </Link>
            </div>
          ) : (
            <>
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mb-5">
                <LockKeyhole className="w-5 h-5" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                Reset your password
              </h1>

              <p className="text-sm text-foreground-muted mt-2">
                Create a new password for:
              </p>

              <p className="text-sm font-medium mt-1 break-all">
                {email}
              </p>

              <form
                onSubmit={submit}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-2"
                  >
                    New Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    minLength={8}
                    autoComplete="new-password"
                    required
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium mb-2"
                  >
                    Confirm New Password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    minLength={8}
                    autoComplete="new-password"
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
                  disabled={saving}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating password…
                    </>
                  ) : (
                    'Update Password'
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