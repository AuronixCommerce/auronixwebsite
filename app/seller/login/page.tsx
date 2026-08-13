'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getData } from '@/lib/firebase-db';
import type { UserProfile } from '@/lib/types';
import { getAccountRestriction } from '@/lib/account-access';
import { AccountRestriction } from '@/components/auth/account-restriction';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
} from 'lucide-react';

export default function SellerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [restriction, setRestriction] = useState<{
    permanent: boolean;
    until: number | null;
    reason: string;
  } | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');
    setRestriction(null);

    try {
      const result =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const profile =
        await getData<UserProfile>(
          `users/${result.user.uid}`
        );

      if (!profile) {
        await auth.signOut();

        throw new Error(
          'Your account profile could not be found. Please contact support.'
        );
      }

      const access =
        getAccountRestriction(profile);

      if (access.blocked) {
        setRestriction({
          permanent: access.permanent,
          until: access.until,
          reason: access.message,
        });

        return;
      }

      if (profile.role !== 'seller') {
        await auth.signOut();

        throw new Error(
          'This account is not registered as a seller account.'
        );
      }

      if (
        profile.status === 'suspended'
      ) {
        setRestriction({
          permanent: true,
          until: null,
          reason:
            'Your seller account is suspended. Please contact support for assistance.',
        });

        return;
      }

      router.push('/seller/dashboard');
    } catch (err) {
      console.error(
        'Seller login failed:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (restriction) {
    return (
      <AccountRestriction
        permanent={
          restriction.permanent
        }
        until={restriction.until}
        reason={restriction.reason}
        onSignOut={async () => {
          await auth.signOut();
          setRestriction(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6"
          >
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">
                A
              </span>
            </div>

            <div className="flex flex-col leading-none text-left">
              <span className="text-sm font-semibold tracking-tight">
                AURONIX
              </span>

              <span className="text-[10px] font-medium tracking-[0.15em] text-foreground-muted uppercase">
                Seller Portal
              </span>
            </div>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Seller Login
          </h1>

          <p className="text-sm text-foreground-muted">
            Sign in to your Auronix seller workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="seller@example.com"
                required
                className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <Link
            href="/seller/apply"
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-accent"
          >
            Apply to become a seller
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}