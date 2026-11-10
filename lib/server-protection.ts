import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export class PublicRequestError extends Error {
  constructor(message: string, public status = 400, public code = 'REQUEST_REJECTED', public retryAfter?: number) { super(message); }
}

const verifiedRequests=new WeakSet<Request>();
export function inheritPublicRequestVerification(parent:Request,child:Request) {if(verifiedRequests.has(parent))verifiedRequests.add(child);return child;}

const cleanKey = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
const requestIp = (request: Request) => (request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function protectPublicRequest(request: Request, scope: string, body: any, options: { limit?: number; windowMs?: number } = {}) {
  const limit = options.limit || 10;
  const windowMs = options.windowMs || 15 * 60_000;
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const identifier = digest(`${requestIp(request)}:${request.headers.get('user-agent') || ''}`).slice(0, 40);
  const rateRef = adminDb.ref(`securityRateLimits/${cleanKey(scope)}/${bucket}/${identifier}`);
  const result = await rateRef.transaction(current => ({ count: Number(current?.count || 0) + 1, expiresAt: (bucket + 2) * windowMs, updatedAt: now }));
  const count = Number(result.snapshot.val()?.count || 0);
  if (count > limit) throw new PublicRequestError('Too many requests. Please wait and try again.', 429, 'RATE_LIMITED', Math.ceil(((bucket + 1) * windowMs - now) / 1000));

  // Hidden fields catch basic form bots without affecting real visitors.
  if (String(body?.websiteUrl || body?.companyWebsiteConfirm || body?.faxNumber || '').trim()) {
    throw new PublicRequestError('Unable to process this request.', 400, 'BOT_REJECTED');
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (secret && process.env.TURNSTILE_ENFORCE === 'true' && !verifiedRequests.has(request)) {
    const token = String(body?.turnstileToken || '').trim();
    if (!token) throw new PublicRequestError('Please complete the security check.', 400, 'BOT_CHECK_REQUIRED');
    const form = new URLSearchParams({ secret, response: token, remoteip: requestIp(request) });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, cache: 'no-store' });
    const verification = await response.json() as { success?: boolean };
    if (!verification.success) throw new PublicRequestError('The security check failed. Please retry.', 400, 'BOT_CHECK_FAILED');
    verifiedRequests.add(request);
  }
}

export function publicRequestErrorResponse(error: unknown) {
  if (!(error instanceof PublicRequestError)) return null;
  return { status: error.status, body: { success: false, error: error.message, code: error.code, retryAfter: error.retryAfter } };
}
