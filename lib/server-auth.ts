import { adminDb } from '@/lib/firebase-admin';
import { adminAuth } from '@/lib/firebase-admin';

export async function verifyIdToken(request: Request) {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    throw new Error('Missing authorization token.');
  }

  const token = header.substring(7).trim();

  if (!token) {
    throw new Error('Missing authorization token.');
  }

  return adminAuth.verifyIdToken(token);
}

export async function requireAdmin(request: Request) {
  const decoded = await verifyIdToken(request);

  // First allow an explicit Firebase custom claim.
  if (decoded.role === 'admin') {
    return decoded;
  }

  // Also support the project's existing RTDB user profile.
  const snapshot = await adminDb
    .ref(`users/${decoded.uid}`)
    .get();

  if (!snapshot.exists()) {
    throw new Error('Admin profile not found.');
  }

  const profile = snapshot.val();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  return decoded;
}