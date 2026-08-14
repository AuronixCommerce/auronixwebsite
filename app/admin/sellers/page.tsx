'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Trash2,
  RefreshCw,
} from 'lucide-react';

export default function AdminSellersPage() {
  const [items, setItems] =
    useState<Record<string, SellerApplication>>({});

  const [loading, setLoading] =
    useState(true);

  const [working, setWorking] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  const [rejectId, setRejectId] =
    useState<string | null>(null);

  const [rejectReason, setRejectReason] =
    useState('');

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return Object.entries(items).filter(
      ([id, seller]) =>
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
  }, [items, search]);

  const adminToken = async () => {
    if (!auth.currentUser) {
      throw new Error('Admin session expired.');
    }

    return auth.currentUser.getIdToken();
  };

  const approve = async (id: string) => {
    setWorking(id);

    try {
      const token = await adminToken();

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
        'Seller approved and invitation sent.'
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

  const resendInvitation = async (
    id: string
  ) => {
    setWorking(id);

    try {
      const token = await adminToken();

      const response = await fetch(
        '/api/admin/sellers/resend',
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
          data.error || 'Unable to resend invitation.'
        );
      }

      alert('A fresh invitation has been sent.');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to resend invitation.'
      );
    } finally {
      setWorking(null);
    }
  };

  const reject = async () => {
    if (
      !rejectId ||
      !rejectReason.trim()
    ) {
      return;
    }

    setWorking(rejectId);

    try {
      const token = await adminToken();

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
        'Applicant notified and application removed.'
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

  const deleteApplication = async (
    id: string
  ) => {
    if (
      !window.confirm(
        'Permanently delete this seller application?'
      )
    ) {
      return;
    }

    setWorking(id);

    try {
      const token = await adminToken();

      const response = await fetch(
        '/api/admin/sellers/delete',
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
          data.error || 'Deletion failed.'
        );
      }

      alert('Application deleted.');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Deletion failed.'
      );
    } finally {
      setWorking(null);
    }
  };

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
            Review applications, send invitations, reject,
            resend, or delete applications.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
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
              {filtered.map(
                ([id, seller]) => (
                  <div
                    key={id}
                    className="p-6"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {seller.businessName}
                          </h2>

                          <span className="text-xs rounded-full bg-secondary px-2.5 py-1">
                            {seller.status}
                          </span>
                        </div>

                        <p className="text-sm text-foreground-muted mt-1">
                          {seller.fullName} ·{' '}
                          {seller.email}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {seller.country && (
                            <span className="text-xs rounded-full bg-secondary px-2.5 py-1">
                              {seller.country}
                            </span>
                          )}

                          {seller.businessType && (
                            <span className="text-xs rounded-full bg-secondary px-2.5 py-1">
                              {seller.businessType}
                            </span>
                          )}
                        </div>

                        {seller.businessInformation && (
                          <p className="max-w-2xl mt-4 text-sm text-foreground-muted leading-relaxed">
                            {seller.businessInformation}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {seller.status !== 'active' &&
                          seller.status !== 'invited' && (
                            <button
                              onClick={() =>
                                approve(id)
                              }
                              disabled={
                                working === id
                              }
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

                        {seller.status ===
                          'invited' && (
                          <button
                            onClick={() =>
                              resendInvitation(
                                id
                              )
                            }
                            disabled={
                              working === id
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                          >
                            {working === id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}

                            Resend Invite
                          </button>
                        )}

                        {seller.status !== 'active' &&
                          seller.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setRejectId(id);
                                setRejectReason('');
                              }}
                              disabled={
                                working === id
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-4 py-2 text-sm hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          )}

                        {seller.status ===
                          'active' && (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 text-green-700 px-4 py-2 text-sm">
                            <Check className="w-4 h-4" />
                            Active
                          </span>
                        )}

                        <button
                          onClick={() =>
                            deleteApplication(id)
                          }
                          disabled={
                            working === id
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-4 py-2 text-sm hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Reject Application
                </h2>

                <p className="text-sm text-foreground-muted mt-1">
                  Enter the internal reason. The system will
                  turn it into a professional applicant email.
                </p>
              </div>

              <button
                onClick={() =>
                  setRejectId(null)
                }
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) =>
                setRejectReason(
                  e.target.value
                )
              }
              rows={7}
              className="w-full mt-5 rounded-xl border border-border bg-background px-4 py-3 text-sm"
              placeholder="Example: Business information is incomplete and the catalog URL is invalid."
            />

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() =>
                  setRejectId(null)
                }
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={reject}
                disabled={
                  !rejectReason.trim() ||
                  working === rejectId
                }
                className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {working === rejectId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}

                Reject & Email
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
