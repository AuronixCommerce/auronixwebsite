import { adminDb } from '@/lib/firebase-admin';
import { adminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/lib/server-admin-session';

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

  if (decoded.role === 'admin') {
    const session = await verifyAdminSession(decoded.uid);
    if (!session.valid) throw new Error('Admin two-factor verification required.');
    return decoded;
  }

  const snapshot = await adminDb.ref(`users/${decoded.uid}`).get();

  if (!snapshot.exists()) {
    throw new Error('Admin profile not found.');
  }

  const profile = snapshot.val();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  const session = await verifyAdminSession(decoded.uid);
  if (!session.valid) throw new Error('Admin two-factor verification required.');

  return decoded;
}

export async function requireSeller(request: Request) {
  const decoded = await verifyIdToken(request);

  // Sellers must never be forced through the admin-only 2FA session flow.
  if (decoded.role === 'seller') return decoded;

  if (decoded.role === 'admin') {
    const session = await verifyAdminSession(decoded.uid);
    if (!session.valid) throw new Error('Admin two-factor verification required.');
    return decoded;
  }

  const snapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  if (!snapshot.exists()) throw new Error('Seller access required.');

  const profile = snapshot.val();
  if (profile?.status === 'disabled') throw new Error('Seller access disabled.');

  if (profile?.role === 'seller') return decoded;

  if (profile?.role === 'admin') {
    const session = await verifyAdminSession(decoded.uid);
    if (!session.valid) throw new Error('Admin two-factor verification required.');
    return decoded;
  }

  throw new Error('Seller access required.');
}
