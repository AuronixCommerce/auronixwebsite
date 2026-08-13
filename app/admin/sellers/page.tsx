'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import type { SellerApplication } from '@/lib/types';
import {
  Search,
  Loader2,
  Check,
  X,
  Mail,
} from 'lucide-react';

export default function AdminSellersPage() {
  const [items, setItems] =
    useState<Record<string, SellerApplication>>({});

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!db) return;

    return onValue(
      ref(db, 'sellerApplications'),
      (snapshot) => {
        setItems(snapshot.val() || {});
        setLoading(false);
      }
    );
  }, []);

  const approve = async (id: string) => {
    if (!auth.currentUser || working) return;

    setWorking(id);

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/sellers/approve',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            applicationId: id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Approval failed.'
        );
      }

      alert(
        'Seller approved. The invitation email has been sent.'
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Approval failed.'
      );
    } finally {
      setWorking(null);
    }
  };

  const reject = async () => {
    if (
      !auth.currentUser ||
      !rejectId ||
      !rejectReason.trim() ||
      working
    ) {
      return;
    }

    setWorking(rejectId);

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/sellers/reject',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            applicationId: rejectId,
            reason: rejectReason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Rejection failed.'
        );
      }

      setRejectId(null);
      setRejectReason('');

      alert(
        'Applicant notified with AI-generated professional feedback and the application was removed.'
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Rejection failed.'
      );
    } finally {
      setWorking(null);
    }
  };

  const filtered = Object.entries(items).filter(
    ([id, seller]) => {
      const q = search.toLowerCase();

      return (
        !q ||
        id.toLowerCase().includes(q) ||
        seller.fullName
          ?.toLowerCase()
          .includes(q) ||
        seller.businessName
          ?.toLowerCase()
          .includes(q) ||
        seller.email
          ?.toLowerCase()
          .includes(q)
      );
    }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX ADMIN
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Seller Applications
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Review, approve, invite, or reject seller applications.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sellers…"
            className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-foreground-muted">
              No seller applications found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(([id, seller]) => (
                <div key={id} className="p-6">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div>
                      <h2 className="font-semibold text-lg">
                        {seller.businessName}
                      </h2>

                      <p className="text-sm text-foreground-muted mt-1">
                        {seller.fullName} · {seller.email}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs rounded-full bg-secondary px-2.5 py-1">
                          {seller.status}
                        </span>

                        {seller.country && (
                          <span className="text-xs rounded-full bg-secondary px-2.5 py-1">
                            {seller.country}
                          </span>
                        )}
                      </div>

                      {seller.businessInformation && (
                        <p className="mt-4 text-sm text-foreground-muted max-w-2xl leading-relaxed">
                          {seller.businessInformation}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {seller.status !== 'active' && (
                        <button
                          onClick={() => approve(id)}
                          disabled={working === id}
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 text-white px-4 py-2 text-sm disabled:opacity-50"
                        >
                          {working === id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}

                          Approve & Invite
                        </button>
                      )}

                      {seller.status !== 'active' && (
                        <button
                          onClick={() => {
                            setRejectId(id);
                            setRejectReason('');
                          }}
                          disabled={working === id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-4 py-2 text-sm hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      )}

                      {seller.status === 'active' && (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 text-green-700 px-4 py-2 text-sm">
                          <Check className="w-4 h-4" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Reject Seller Application
                </h2>

                <p className="text-sm text-foreground-muted mt-1">
                  Enter the internal reason. Groq will turn it into a professional applicant-facing explanation.
                </p>
              </div>

              <button
                onClick={() => setRejectId(null)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) =>
                setRejectReason(e.target.value)
              }
              rows={7}
              placeholder="Example: Business description is incomplete and the submitted catalog URL is not valid. Please provide a working catalog and clearer company information."
              className="w-full mt-5 rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setRejectId(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                onClick={reject}
                disabled={
                  !rejectReason.trim() ||
                  working === rejectId
                }
                className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {working === rejectId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}

                Reject & Email Applicant
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
