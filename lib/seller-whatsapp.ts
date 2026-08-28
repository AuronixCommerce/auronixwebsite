import { createHmac, timingSafeEqual } from 'crypto';

export const AURONIX_WHATSAPP_NUMBER = '15485789795';
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_REQUEST_WINDOW_MS = 30 * 60 * 1000;
export const OTP_MAX_REQUESTS_PER_WINDOW = 3;

export function normalizePhone(value: unknown): string {
  let phone = typeof value === 'string' ? value.trim() : '';

  if (phone.startsWith('00')) {
    phone = phone.slice(2);
  }

  const digits = phone.replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error('Enter a valid WhatsApp number including the country code.');
  }

  return digits;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return '•'.repeat(Math.max(4, phone.length - 4)) + phone.slice(-4);
}

function otpSecret(): string {
  const value = process.env.SELLER_WHATSAPP_OTP_SECRET?.trim();
  if (!value || value.length < 24) {
    throw new Error('Seller WhatsApp OTP secret is not configured.');
  }
  return value;
}

export function hashOtp(verificationId: string, phone: string, code: string): string {
  return createHmac('sha256', otpSecret())
    .update(`${verificationId}:${phone}:${code}`)
    .digest('hex');
}

export function verifyOtpHash(
  verificationId: string,
  phone: string,
  code: string,
  expectedHash: string
): boolean {
  const actual = Buffer.from(hashOtp(verificationId, phone, code), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function whatsappMessage(code: string): string {
  return `VERIFY AURONIX ${code}`;
}

export function whatsappUrl(code: string): string {
  return `https://wa.me/${AURONIX_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage(code))}`;
}

export function safeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}
