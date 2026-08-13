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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getData<UserProfile>(`users/${result.user.uid}`);
      if (!profile || profile.role !== 'admin') {
        toast({ title: 'Access denied', description: 'This account does not have admin privileges.', variant: 'destructive' });
        await auth.signOut();
        setLoading(false);
        return;
      }
      toast({ title: 'Welcome back', description: 'Redirecting to dashboard…' });
      router.push('/admin');
    } catch (err) {
      toast({
        title: 'Login failed',
        description: 'Invalid email or password.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle px-5">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">A</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">AURONIX</span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-foreground-muted uppercase">Admin</span>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Admin Login</h1>
          <p className="text-sm text-foreground-muted">Sign in to the admin dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8">
          <div>
            <Label className="mb-2 block">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@auronix.com" />
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

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
