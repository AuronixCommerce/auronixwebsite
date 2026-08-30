'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/admin-layout';
import { confirmAction, notifyAction } from '@/components/ui/confirm-action';
import type { UserProfile } from '@/lib/types';
import {
  Loader2,
  Search,
  Shield,
  UserRound,
  Ban,
  Clock3,
  Trash2,
  KeyRound,
  Unlock,
  X,
} from 'lucide-react';

type UserAction =
  | 'temporary-ban'
  | 'permanent-ban'
  | 'unban'
  | 'delete'
  | 'reset-password';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [banMode, setBanMode] = useState<'temporary' | 'permanent'>(
    'temporary'
  );
  const [banMinutes, setBanMinutes] = useState('60');
  const [banReason, setBanReason] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!db) return;

    return onValue(ref(db, 'users'), (snapshot) => {
      setUsers(snapshot.val() || {});
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return Object.entries(users).filter(([uid, user]) => {
      if (!query) return true;

      return (
        uid.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.businessName?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  const callAction = async (
    action: UserAction,
    uid: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (!auth.currentUser) {
      throw new Error('You are not authenticated.');
    }

    const token = await auth.currentUser.getIdToken();

    const response = await fetch('/api/admin/users/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        uid,
        ...extra,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to complete this action.'
      );
    }

    return data;
  };

  const openBanModal = (
    uid: string,
    mode: 'temporary' | 'permanent'
  ) => {
    setSelectedUser(uid);
    setBanMode(mode);
    setBanReason('');
    setBanMinutes('60');
  };

  const submitBan = async () => {
    if (!selectedUser) return;

    setWorking(true);

    try {
      await callAction(
        banMode === 'temporary'
          ? 'temporary-ban'
          : 'permanent-ban',
        selectedUser,
        {
          durationMinutes:
            banMode === 'temporary'
              ? Number(banMinutes)
              : undefined,
          reason: banReason.trim(),
        }
      );

      setSelectedUser(null);
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to ban user.'
      );
    } finally {
      setWorking(false);
    }
  };

  const unban = async (uid: string) => {
    if (!await confirmAction({
      title: 'Remove this user’s ban?',
      description: 'The user will regain access according to their account permissions.',
      confirmLabel: 'Remove ban',
    })) return;

    try {
      await callAction('unban', uid);
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to unban user.'
      );
    }
  };

  const deleteUser = async (uid: string) => {
    if (
      !await confirmAction({
        title: 'Permanently delete this account?',
        description: 'This removes the account and its associated records. This action cannot be undone.',
        confirmLabel: 'Delete account',
        destructive: true,
      })
    ) {
      return;
    }

    try {
      await callAction('delete', uid);
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to delete user.'
      );
    }
  };

  const resetPassword = async (uid: string) => {
    try {
      const data = await callAction(
        'reset-password',
        uid
      );

      await navigator.clipboard.writeText(data.resetLink);

      notifyAction(
        `Password reset link generated for ${data.email} and copied to clipboard.`
      );
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to generate reset link.'
      );
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
            Users
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Manage accounts, access restrictions, passwords, and deletion.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, business, role, or UID…"
            className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-foreground-muted">
              No users found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map(([uid, user]) => {
                const isSelf =
                  auth.currentUser?.uid === uid;

                const temporaryBan =
                  Boolean(user.banned) &&
                  Boolean(user.bannedUntil) &&
                  Number(user.bannedUntil) > Date.now();

                return (
                  <UserRow
                    key={uid}
                    uid={uid}
                    user={user}
                    isSelf={isSelf}
                    temporaryBan={temporaryBan}
                    onTemporaryBan={() =>
                      openBanModal(uid, 'temporary')
                    }
                    onPermanentBan={() =>
                      openBanModal(uid, 'permanent')
                    }
                    onUnban={() => unban(uid)}
                    onDelete={() => deleteUser(uid)}
                    onResetPassword={() =>
                      resetPassword(uid)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {banMode === 'temporary'
                    ? 'Temporarily Ban User'
                    : 'Permanently Ban User'}
                </h2>

                <p className="mt-1 text-sm text-foreground-muted">
                  The user will be blocked from Firebase Authentication.
                </p>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {banMode === 'temporary' && (
              <div className="mt-5">
                <label className="block text-sm font-medium mb-2">
                  Duration
                </label>

                <select
                  value={banMinutes}
                  onChange={(e) =>
                    setBanMinutes(e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="180">3 hours</option>
                  <option value="360">6 hours</option>
                  <option value="720">12 hours</option>
                  <option value="1440">24 hours</option>
                  <option value="4320">3 days</option>
                  <option value="10080">7 days</option>
                  <option value="43200">30 days</option>
                </select>
              </div>
            )}

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Reason
              </label>

              <textarea
                value={banReason}
                onChange={(e) =>
                  setBanReason(e.target.value)
                }
                rows={5}
                placeholder="Explain why access is being restricted…"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                onClick={submitBan}
                disabled={working}
                className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {working && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}

                {banMode === 'temporary'
                  ? 'Apply Temporary Ban'
                  : 'Apply Permanent Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function UserRow({
  uid,
  user,
  isSelf,
  temporaryBan,
  onTemporaryBan,
  onPermanentBan,
  onUnban,
  onDelete,
  onResetPassword,
}: {
  uid: string;
  user: UserProfile;
  isSelf: boolean;
  temporaryBan: boolean;
  onTemporaryBan: () => void;
  onPermanentBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
}) {
  return (
    <div className="p-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            {user.role === 'admin' ? (
              <Shield className="w-5 h-5" />
            ) : (
              <UserRound className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold truncate">
                {user.name ||
                  user.displayName ||
                  user.email}
              </h2>

              <span className="text-[11px] rounded-full bg-secondary px-2.5 py-1">
                {user.role}
              </span>

              {user.banned && (
                <span className="text-[11px] rounded-full bg-red-500/10 text-red-600 px-2.5 py-1">
                  {temporaryBan
                    ? 'Temporarily Banned'
                    : 'Permanently Banned'}
                </span>
              )}
            </div>

            <p className="text-sm text-foreground-muted mt-1">
              {user.email}
            </p>

            <p className="text-xs text-foreground-muted mt-1 break-all">
              UID: {uid}
            </p>

            {user.banReason && (
              <p className="text-xs text-red-600 mt-2">
                Reason: {user.banReason}
              </p>
            )}

            {temporaryBan && user.bannedUntil && (
              <BanCountdown
                until={user.bannedUntil}
              />
            )}
          </div>
        </div>

        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onResetPassword}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm hover:bg-secondary"
            >
              <KeyRound className="w-4 h-4" />
              Reset Password
            </button>

            {user.banned ? (
              <button
                onClick={onUnban}
                className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 text-green-700 px-3.5 py-2 text-sm hover:bg-green-500/10"
              >
                <Unlock className="w-4 h-4" />
                Unban
              </button>
            ) : (
              <>
                <button
                  onClick={onTemporaryBan}
                  className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/20 text-yellow-700 px-3.5 py-2 text-sm hover:bg-yellow-500/10"
                >
                  <Clock3 className="w-4 h-4" />
                  Temp Ban
                </button>

                <button
                  onClick={onPermanentBan}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-3.5 py-2 text-sm hover:bg-red-500/10"
                >
                  <Ban className="w-4 h-4" />
                  Permanent Ban
                </button>
              </>
            )}

            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-3.5 py-2 text-sm hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BanCountdown({
  until,
}: {
  until: number;
}) {
  const [remaining, setRemaining] = useState(
    Math.max(0, until - Date.now())
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, until - Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [until]);

  if (remaining <= 0) {
    return (
      <p className="text-xs text-green-700 mt-2">
        Temporary ban has expired. User can be unbanned.
      </p>
    );
  }

  return (
    <p className="text-xs text-red-600 mt-2">
      Access blocked for{' '}
      <strong>{formatRemaining(remaining)}</strong>
    </p>
  );
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
