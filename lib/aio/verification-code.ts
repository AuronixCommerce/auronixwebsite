/** Accept common pasted OTP formatting and Arabic/Persian keyboard digits. */
export function normalizeVerificationCode(value: string): string {
  return value.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069-]/g, '');
}
