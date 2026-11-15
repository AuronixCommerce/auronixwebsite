import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';

export const ADMIN_SESSION_COOKIE = 'auronix_admin_session';
export const adminMfaConfigured = () => Boolean(process.env.ADMIN_MFA_SECRET?.trim());
const signature = (value: string) => createHmac('sha256', process.env.ADMIN_MFA_SECRET || 'not-configured').update(value).digest('hex');
export function createAdminSessionValue(uid: string, expiresAt: number) { const id = randomBytes(18).toString('hex'); const value = `${uid}.${expiresAt}.${id}`; return { id, value: `${value}.${signature(value)}` }; }
export async function verifyAdminSession(uid: string) {
  if (!adminMfaConfigured()) return { valid: true, configured: false };
  const raw = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value || '';
  const parts = raw.split('.'); if (parts.length !== 4 || parts[0] !== uid) return { valid: false, configured: true };
  const [cookieUid, expiry, id, supplied] = parts; const value = `${cookieUid}.${expiry}.${id}`; const expected = signature(value);
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) || Number(expiry) <= Date.now()) return { valid: false, configured: true };
  const record = (await adminDb.ref(`adminSessions/${uid}/${id}`).get()).val();
  if (!record || record.revokedAt || Number(record.expiresAt || 0) <= Date.now()) return { valid: false, configured: true };
  await adminDb.ref(`adminSessions/${uid}/${id}`).update({ lastSeenAt: Date.now() }).catch(() => undefined);
  return { valid: true, configured: true, id, expiresAt: Number(expiry) };
}
