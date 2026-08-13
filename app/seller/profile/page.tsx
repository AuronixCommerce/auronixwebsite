'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { SellerLayout } from '@/components/seller/seller-layout';
import { Loader2, UserRound } from 'lucide-react';

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !db) {
      setLoading(false);
      return;
    }

    return onValue(ref(db, `users/${uid}`), (snapshot) => {
      setProfile(snapshot.val() || null);
      setLoading(false);
    });
  }, []);

  return (
    <SellerLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Profile
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Your seller account information.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserRound className="w-6 h-6 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold text-lg">
                  {profile?.displayName ||
                    profile?.name ||
                    'Seller'}
                </h2>

                <p className="text-sm text-foreground-muted">
                  {profile?.email}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mt-6">
              <Info label="Business" value={profile?.businessName} />
              <Info label="Role" value={profile?.role} />
              <Info label="Status" value={profile?.status} />
              <Info label="Phone" value={profile?.phone} />
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-4">
      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">
        {label}
      </div>

      <div className="mt-1 text-sm">
        {value || 'Not provided'}
      </div>
    </div>
  );
}
