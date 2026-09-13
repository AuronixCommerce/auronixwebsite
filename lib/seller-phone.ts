/** Contact normalization only; no phone verification is required. */
export function normalizePhone(value: unknown): string {
  let phone = typeof value === 'string' ? value.trim() : '';
  if (phone.startsWith('00')) phone = phone.slice(2);
  const digits = phone.replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(digits)) throw new Error('Enter a valid phone number including the country code.');
  return digits;
}
