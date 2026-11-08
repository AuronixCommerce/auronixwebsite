'use client';
import { onAuthStateChanged } from 'firebase/auth';
import { OperationsOverview } from '@/components/admin/operations-overview';
import { userFacingError } from '@/lib/user-facing-error';
import { Spinner } from '@/components/design/primitives';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { notifyAction } from '@/components/ui/confirm-action';

import {
  Activity,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Globe,
  Loader2,
  Mail,
  Newspaper,
  ShoppingBag,
  Ticket,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

import {
  onValue,
  ref,
} from 'firebase/database';

import {
  auth,
  db,
} from '@/lib/firebase';

import {
  AdminLayout,
} from '@/components/admin/admin-layout';

interface Counts {
  suppliers: number;
  contacts: number;
  tickets: number;
  sellers: number;
  blog: number;
  careers: number;
  partners: number;
  newsletterSubscribers: number;
}

const INITIAL_COUNTS: Counts = {
  suppliers: 0,
  contacts: 0,
  tickets: 0,
  sellers: 0,
  blog: 0,
  careers: 0,
  partners: 0,
  newsletterSubscribers: 0,
};

export default function AdminDashboardPage() {
  const [
    counts,
    setCounts,
  ] = useState<Counts>(
    INITIAL_COUNTS
  );

  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  const [
    availability,
    setAvailability,
  ] = useState(true);

  const [
    updatingAvailability,
    setUpdatingAvailability,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribers: Array<
      () => void
    > = [];

    const subscribeToCount = (
      path: string,
      update: (
        current: Counts,
        value: unknown
      ) => Counts
    ) => {
      const unsubscribe =
        onValue(
          ref(db, path),
          (snapshot) => {
            const value =
              snapshot.exists()
                ? snapshot.val()
                : null;

            setCounts(
              (current) =>
                update(
                  current,
                  value
                )
            );

            setLoading(false);
          },
          (error) => {
            console.error(
              `Failed to read ${path}:`,
              error
            );

            setLoading(false);
          }
        );

      unsubscribers.push(
        unsubscribe
      );
    };

    const stopAuth = onAuthStateChanged(auth, (user) => {
      unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
      if (!user) return;
      setLoading(true);
    subscribeToCount(
      'suppliers',
      (
        current,
        value
      ) => ({
        ...current,
        suppliers:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'contact',
      (
        current,
        value
      ) => ({
        ...current,
        contacts:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'tickets',
      (
        current,
        value
      ) => ({
        ...current,
        tickets:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'sellerApplications',
      (
        current,
        value
      ) => ({
        ...current,
        sellers:
          value &&
          typeof value ===
            'object'
            ? Object.keys(
                value as object
              ).length
            : 0,
      })
    );

    subscribeToCount(
      'blogPosts',
      (
        current,
        value
      ) => {
        let publishedCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          publishedCount =
            Object.values(
              value as Record<
                string,
                {
                  published?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.published ===
                true
            ).length;
        }

        return {
          ...current,
          blog:
            publishedCount,
        };
      }
    );

    subscribeToCount(
      'careers',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  status?: string;
                }
              >
            ).filter(
              (item) =>
                item?.status ===
                'active'
            ).length;
        }

        return {
          ...current,
          careers:
            activeCount,
        };
      }
    );

    subscribeToCount(
      'partners',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  active?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.active ===
                true
            ).length;
        }

        return {
          ...current,
          partners:
            activeCount,
        };
      }
    );

    subscribeToCount(
      'newsletterSubscribers',
      (
        current,
        value
      ) => {
        let activeCount =
          0;

        if (
          value &&
          typeof value ===
            'object'
        ) {
          activeCount =
            Object.values(
              value as Record<
                string,
                {
                  active?: boolean;
                }
              >
            ).filter(
              (item) =>
                item?.active ===
                true
            ).length;
        }

        return {
          ...current,
          newsletterSubscribers:
            activeCount,
        };
      }
    );

    });
    return () => {
      stopAuth();
      unsubscribers.forEach(
        (
          unsubscribe
        ) =>
          unsubscribe()
      );
    };
  }, []);

  useEffect(() => {
    let active =
      true;

    async function loadAvailability() {
      try {
        if (
          !auth.currentUser
        ) {
          return;
        }

        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/availability',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                'no-store',
            }
          );

        if (
          !response.ok
        ) {
          return;
        }

        const data =
          await response.json();

        if (
          active &&
          typeof data.online ===
            'boolean'
        ) {
          setAvailability(data.online);
          setAvailabilityLoaded(true);
        }
      } catch (
        error
      ) {
        console.error(
          'Unable to load admin availability:',
          error
        );
      }
    }

    const stopAuth = onAuthStateChanged(auth, user => { if (user) void loadAvailability(); });

    return () => {
      stopAuth();
      active =
        false;
    };
  }, []);

  const toggleAvailability =
    async () => {
      if (
        !auth.currentUser ||
        updatingAvailability
      ) {
        return;
      }

      setUpdatingAvailability(
        true
      );

      try {
        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            '/api/admin/availability',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  online:
                    !availability,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to update admin availability.'
          );
        }

        setAvailability(
          Boolean(
            data.online
          )
        );
      } catch (
        error
      ) {
        notifyAction(
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to update admin availability.'
        );
      } finally {
        setUpdatingAvailability(
          false
        );
      }
    };

  return <AdminLayout><OperationsOverview counts={counts} loading={loading} availability={availabilityLoaded ? availability : null} updatingAvailability={updatingAvailability} onToggleAvailability={toggleAvailability} /></AdminLayout>;
}
