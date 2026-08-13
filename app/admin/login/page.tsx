'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getData } from '@/lib/firebase-db';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      console.log('Firebase Auth UID:', result.user.uid);
      console.log('Firebase Auth email:', result.user.email);

      const profile = await getData<UserProfile>(
        `users/${result.user.uid}`
      );

      console.log('Admin profile from RTDB:', profile);

      if (!profile) {
        await auth.signOut();

        toast({
          title: 'Admin profile not found',
          description: `No RTDB profile exists at users/${result.user.uid}`,
          variant: 'destructive',
        });

        setLoading(false);
        return;
      }

      if (profile.role !== 'admin') {
        await auth.signOut();

        toast({
          title: 'Access denied',
          description: `Firebase role is "${profile.role}", not "admin".`,
          variant: 'destructive',
        });

        setLoading(false);
        return;
      }

      toast({
        title: 'Welcome back',
        description: 'Redirecting to dashboard…',
      });

      router.push('/admin');
    } catch (err: unknown) {
      console.error('Admin login error:', err);

      let message = 'Unable to sign in.';

      if (err && typeof err === 'object' && 'code' in err) {
        const code = String(
          (err as { code?: unknown }).code || ''
        );

        switch (code) {
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            message = 'The email or password is incorrect.';
            break;

          case 'auth/user-not-found':
            message = 'No Firebase Authentication user exists for this email.';
            break;

          case 'auth/wrong-password':
            message = 'The password is incorrect.';
            break;

          case 'auth/invalid-email':
            message = 'The email address is invalid.';
            break;

          case 'auth/user-disabled':
            message = 'This Firebase Authentication account is disabled.';
            break;

          case 'PERMISSION_DENIED':
          case 'database/permission-denied':
            message = 'Firebase Realtime Database rules blocked the profile lookup.';
            break;

          default:
            message = code || 'An unexpected authentication error occurred.';
        }
      }

      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle px-5">
      <div className="max-w-md w-full">
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

            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">
                AURONIX
              </span>

              <span className="text-[10px] font-medium tracking-[0.15em] text-foreground-muted uppercase">
                Admin
              </span>
            </div>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Admin Login
          </h1>

          <p className="text-sm text-foreground-muted">
            Sign in to the admin dashboard.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-8"
        >
          <div>
            <Label
              htmlFor="email"
              className="mb-2 block"
            >
              Email
            </Label>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="mb-2 block"
            >
              Password
            </Label>

            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}