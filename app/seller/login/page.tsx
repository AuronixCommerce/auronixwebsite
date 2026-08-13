'use client';

import { useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SellerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Welcome back', description: 'Redirecting to your dashboard…' });
      router.push('/seller/dashboard');
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err instanceof Error && err.message.includes('permission')
          ? 'Invalid email or password.'
          : 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <Section className="min-h-[70vh] flex items-center">
        <Reveal className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <Link href="/seller" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Seller Portal
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Seller Login</h1>
            <p className="text-sm text-foreground-muted">Access your seller dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8">
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@business.com" />
            </div>
            <div>
              <Label className="mb-2 block">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
              ) : (
                <>Sign In<ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-foreground-muted mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/seller/apply" className="font-medium text-foreground hover:text-accent transition-colors">
              Apply to become a seller
            </Link>
          </p>
        </Reveal>
      </Section>
    </SiteLayout>
  );
}
