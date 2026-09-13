/** Keep provider names, SDK codes and configuration details out of product messages. */
export function userFacingError(error: unknown, fallback = 'We could not complete this request. Please try again.'): string {
  const value = error as { code?: unknown; message?: unknown } | null;
  const message = typeof error === 'string' ? error : typeof value?.message === 'string' ? value.message : '';
  const code = String(value?.code || message.match(/auth\/[\w-]+/)?.[0] || '');
  if (/invalid-credential|invalid-login-credentials|wrong-password|user-not-found/.test(code)) return 'Auronix Auth: The email or password is incorrect. Please try again.';
  if (/invalid-email/.test(code)) return 'Auronix Auth: Enter a valid email address.';
  if (/too-many-requests/.test(code)) return 'Auronix Auth: Too many attempts. Please wait a few minutes and try again.';
  if (/network-request-failed/.test(code)) return 'Auronix Auth: Check your connection and try again.';
  if (/user-disabled/.test(code)) return 'Auronix Auth: This account is unavailable. Please contact support.';
  if (/expired|invalid-action-code|invalid-verification-code/.test(code)) return 'Auronix Auth: This code or link is invalid or has expired. Request a new one.';
  if (/weak-password/.test(code)) return 'Auronix Auth: Choose a stronger password with at least eight characters.';
  if (/email-already-in-use/.test(code)) return 'Auronix Auth: This email is already registered. Sign in or reset your password.';
  if (/permission[_-]denied/i.test(code + message)) return 'You do not have access to this action. Please sign in again or contact support.';
  if (/firebase|firestore|identitytoolkit|securetoken|api[_ -]?key|service.account|SMTP|GROQ|environment variable|auth\/[\w-]+|database\/[\w-]+/i.test(message + code)) return code.startsWith('auth/') ? 'Auronix Auth is temporarily unavailable. Please try again shortly.' : fallback;
  return message || fallback;
}
