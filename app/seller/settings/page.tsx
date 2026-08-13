'use client';

import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { auth } from '@/lib/firebase';
import { updateData, getTimestamp } from '@/lib/firebase-db';
import { onAuthChange, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/site/states';
import { Loader2, Save, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (!user) { router.push('/seller/login'); return; }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const { updatePassword } = await import('firebase/auth');
      await updatePassword(user, newPassword);
      await updateData(`users/${user.uid}`, { updatedAt: getTimestamp() });
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/seller');
  };

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;

  return (
    <SellerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-sm text-foreground-muted">Manage your account settings.</p>
      </div>

      <form onSubmit={handlePasswordChange} className="max-w-xl space-y-5 rounded-2xl border border-border bg-card p-8 mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Change Password</h2>
        <div>
          <Label className="mb-2 block">New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <Label className="mb-2 block">Confirm New Password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : <><Save className="w-4 h-4 mr-2" />Update Password</>}
        </Button>
      </form>

      <div className="max-w-xl rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
        <h2 className="text-lg font-semibold tracking-tight mb-2">Sign Out</h2>
        <p className="text-sm text-foreground-muted mb-4">Sign out of your seller account.</p>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </SellerLayout>
  );
}
