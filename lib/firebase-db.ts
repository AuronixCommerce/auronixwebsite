import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  type DataSnapshot,
} from 'firebase/database';
import { db } from './firebase';
import type { DatabaseError } from './types';

function handleError(error: unknown, operation: string): never {
  console.error(`[firebase-db] ${operation} failed:`, error);
  const message =
    error instanceof Error
      ? error.message.includes('permission')
        ? 'You do not have permission to perform this action.'
        : 'Something went wrong. Please try again.'
      : 'Something went wrong. Please try again.';
  throw new Error(message);
}

export async function getData<T>(path: string): Promise<T | null> {
  try {
    const snapshot = await get(ref(db, path));
    if (!snapshot.exists()) return null;
    return snapshot.val() as T;
  } catch (error) {
    handleError(error, `getData(${path})`);
  }
}

export async function getList<T>(
  path: string,
  orderBy?: string,
  limit?: number
): Promise<(T & { id: string })[]> {
  try {
    let q = ref(db, path);
    if (orderBy) {
      q = query(ref(db, path), orderByChild(orderBy)) as unknown as typeof q;
      if (limit) {
        q = query(ref(db, path), orderByChild(orderBy), limitToLast(limit)) as unknown as typeof q;
      }
    }
    const snapshot = await get(q);
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    if (typeof val !== 'object') return [];
    return Object.entries(val).map(([id, data]) => ({
      id,
      ...(data as object),
    })) as (T & { id: string })[];
  } catch (error) {
    handleError(error, `getList(${path})`);
  }
}

export async function setData<T>(path: string, data: T): Promise<void> {
  try {
    await set(ref(db, path), data);
  } catch (error) {
    handleError(error, `setData(${path})`);
  }
}

export async function pushData<T extends Record<string, unknown>>(
  path: string,
  data: T
): Promise<string> {
  try {
    const newRef = push(ref(db, path));
    await set(newRef, data);
    return newRef.key as string;
  } catch (error) {
    handleError(error, `pushData(${path})`);
  }
}

export async function updateData(path: string, updates: Record<string, unknown>): Promise<void> {
  try {
    await update(ref(db, path), updates);
  } catch (error) {
    handleError(error, `updateData(${path})`);
  }
}

export async function removeData(path: string): Promise<void> {
  try {
    await remove(ref(db, path));
  } catch (error) {
    handleError(error, `removeData(${path})`);
  }
}

export function subscribeToData<T>(
  path: string,
  callback: (data: T | null) => void,
  onError?: (error: Error) => void
): () => void {
  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    (snapshot: DataSnapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as T) : null);
    },
    (error: DatabaseError) => {
      if (onError) onError(new Error(error.message));
    }
  );
  return () => {
    off(dbRef);
    unsubscribe();
  };
}

export function subscribeToList<T>(
  path: string,
  callback: (data: (T & { id: string })[]) => void,
  onError?: (error: Error) => void
): () => void {
  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const val = snapshot.val();
      if (typeof val !== 'object') {
        callback([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]) => ({
        id,
        ...(data as object),
      })) as (T & { id: string })[];
      callback(list);
    },
    (error: DatabaseError) => {
      if (onError) onError(new Error(error.message));
    }
  );
  return () => {
    off(dbRef);
    unsubscribe();
  };
}

export function getTimestamp(): number {
  return Date.now();
}
