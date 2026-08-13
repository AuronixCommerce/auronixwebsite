'use client';

import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { auth } from '@/lib/firebase';
import { getData, updateData, getTimestamp } from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/site/states';
import { Loader2, Save } from 'lucide-react';

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', businessName: '', phone: '', country: '' });

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const p = await getData<UserProfile>(`users/${user.uid}`);
        setProfile(p);
        setForm({
          name: p?.name || p?.displayName || '',
          businessName: p?.businessName || '',
          phone: '',
          country: '',
        });
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || saving) return;
    setSaving(true);
    try {
      await updateData(`users/${auth.currentUser.uid}`, {
        name: form.name,
        businessName: form.businessName,
        updatedAt: getTimestamp(),
      });
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SellerLayout><LoadingState /></SellerLayout>;

  return (
    <SellerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Profile</h1>
        <p className="text-sm text-foreground-muted">Manage your seller profile information.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-xl space-y-5 rounded-2xl border border-border bg-card p-8">
        <div>
          <Label className="mb-2 block">Email</Label>
          <Input value={profile?.email || ''} disabled className="bg-secondary" />
          <p className="text-xs text-foreground-muted mt-1.5">Email cannot be changed.</p>
        </div>
        <div>
          <Label className="mb-2 block">Name</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <Label className="mb-2 block">Business Name</Label>
          <Input value={form.businessName} onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </form>
    </SellerLayout>
  );
}
