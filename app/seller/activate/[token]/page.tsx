'use client';

import { useState, useEffect } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { getData, updateData } from '@/lib/firebase-db';
import { ref, get } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Loader2, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SellerActivatePage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const snapshot = await get(ref(db, 'sellerApplications'));
        if (!snapshot.exists()) {
          setLoading(false);
          return;
        }
        const apps = snapshot.val();
        let found = false;
        for (const [id, app] of Object.entries(apps) as [string, any][]) {
          if (app.invitationToken === params.token && app.invitationExpires && app.invitationExpires > Date.now()) {
            setValid(true);
            setEmail(app.email);
            setApplicationId(id);
            found = true;
            break;
          }
        }
        if (!found) {
          setValid(false);
        }
      } catch {
        setValid(false);
      }
      setLoading(false);
    })();
  }, [params.token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please confirm your password.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const now = Date.now();

      await updateData(`users/${uid}`, {
        uid,
        email,
        role: 'seller',
        sellerApplicationId: applicationId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      await updateData(`sellerApplications/${applicationId}`, {
        status: 'active',
        invitationToken: null,
        invitationExpires: null,
        updatedAt: now,
      });

      setSuccess(true);
      toast({ title: 'Account activated', description: 'Welcome to Auronix.' });
      setTimeout(() => router.push('/seller/dashboard'), 2000);
    } catch (err) {
      toast({
        title: 'Activation failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SiteLayout>
        <Section className="min-h-[60vh] flex items-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground-muted" />
            <p className="mt-4 text-sm text-foreground-muted">Verifying invitation…</p>
          </div>
        </Section>
      </SiteLayout>
    );
  }

  if (success) {
    return (
      <SiteLayout>
        <Section className="min-h-[60vh] flex items-center">
          <Reveal className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-4">Account activated.</h1>
            <p className="text-lg text-foreground-muted leading-relaxed mb-8">
              Your seller account is now active. Redirecting you to your dashboard…
            </p>
            <Link href="/seller/dashboard">
              <Button>Go to Dashboard<ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  if (!valid) {
    return (
      <SiteLayout>
        <Section className="min-h-[60vh] flex items-center">
          <Reveal className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-4">Invalid or expired invitation.</h1>
            <p className="text-lg text-foreground-muted leading-relaxed mb-8">
              This invitation link is no longer valid. Please contact support if you believe this is an error.
            </p>
            <Link href="/support"><Button variant="outline">Contact Support</Button></Link>
          </Reveal>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Section className="min-h-[60vh] flex items-center">
        <Reveal className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Activate your account</h1>
            <p className="text-sm text-foreground-muted">Create your password to access your seller dashboard.</p>
          </div>

          <form onSubmit={handleActivate} className="space-y-5 rounded-2xl border border-border bg-card p-8">
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input value={email} disabled className="bg-secondary" />
            </div>
            <div>
              <Label className="mb-2 block">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters" />
            </div>
            <div>
              <Label className="mb-2 block">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter password" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Activating…</>
              ) : (
                <>Activate Account<ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
        </Reveal>
      </Section>
    </SiteLayout>
  );
}
