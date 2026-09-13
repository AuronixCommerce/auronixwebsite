import nodemailer from 'nodemailer';

export type EmailType = string;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://auronixcommerce.com').replace(/\/+$/, '');
export const BUSINESS_EMAIL = process.env.MAIL_FROM || process.env.SMTP_USER || 'business@auronixcommerce.com';
export const NOTIFICATION_EMAIL = process.env.MAIL_FROM || BUSINESS_EMAIL;
export const SUPPORT_EMAIL = process.env.MAIL_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || BUSINESS_EMAIL;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Auronix Commerce LLC';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || NOTIFICATION_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

type MailOptions = { to: string | string[]; subject: string; html: string; text?: string; replyTo?: string; fromName?: string };
const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

function safeAbsoluteUrl(value: unknown, fallback: string) {
  try { const url = new URL(String(value || fallback), SITE_URL); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : fallback; }
  catch { return fallback; }
}

function emailShell(input: { preheader: string; title: string; body: string; footerNote?: string }) {
  const support = escapeHtml(SUPPORT_EMAIL);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e5e5ea;border-radius:24px;overflow:hidden"><tr><td style="padding:24px 30px;border-bottom:1px solid #ececf0"><a href="${SITE_URL}" style="color:#111827;text-decoration:none;font-size:17px;font-weight:800;letter-spacing:.06em">AURONIX <span style="font-weight:500;color:#6b7280">COMMERCE LLC</span></a></td></tr><tr><td style="padding:34px 30px;font-size:15px;line-height:1.65">${input.body}</td></tr><tr><td style="padding:22px 30px;border-top:1px solid #ececf0;color:#6b7280;font-size:12px;line-height:1.6">${escapeHtml(input.footerNote || 'This is a transactional message from Auronix Commerce LLC.')}<br>Questions? <a href="mailto:${support}" style="color:#2563eb">${support}</a><br><span style="color:#9ca3af">Auronix Commerce LLC · auronixcommerce.com</span></td></tr></table></td></tr></table></body></html>`;
}

const cta = (label: string, url: string) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td style="border-radius:12px;background:#111827"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></td></tr></table>`;

async function sendWithSender(sender: string, options: MailOptions) {
  if (!options.to || (Array.isArray(options.to) && !options.to.length)) throw new Error('Email recipient is required.');
  if (!SMTP_PASSWORD) throw new Error('Email service is not configured. Set SMTP_PASSWORD.');
  const transporter = nodemailer.createTransport({ connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } });
  return transporter.sendMail({ from: { name: options.fromName || MAIL_FROM_NAME, address: sender }, to: options.to, subject: options.subject, html: options.html, text: options.text, replyTo: options.replyTo || SUPPORT_EMAIL });
}

export const sendNotificationMail = (options: MailOptions) => sendWithSender(NOTIFICATION_EMAIL, options);
export const sendBusinessMail = (options: MailOptions) => sendWithSender(BUSINESS_EMAIL, options);

export function sendProfessionalEmail(value: any, type = '') {
  const body = String(value?.body || value?.text || '');
  const html = value?.html || emailShell({ preheader: value?.subject || 'Auronix Commerce update', title: value?.subject || 'Auronix Commerce', body: `<p style="margin:0 0 18px">Hello${value?.name ? ` ${escapeHtml(value.name)}` : ''},</p><div style="white-space:pre-wrap">${escapeHtml(body)}</div>` });
  const systemTypes = ['notification', 'notifications', 'admin', 'sellerInvitation', 'seller-invitation', 'passwordReset', 'password-reset'];
  return sendWithSender(systemTypes.includes(type || value?.type) ? NOTIFICATION_EMAIL : BUSINESS_EMAIL, { to: value?.to || value?.recipient || value?.email, subject: value?.subject || 'Auronix Commerce LLC', html, text: value?.text || body, replyTo: value?.replyTo });
}

export async function sendSellerInvitationEmail(input: { email: string; name?: string; businessName?: string; invitationUrl: string; expiresAt?: number }) {
  const url = safeAbsoluteUrl(input.invitationUrl, `${SITE_URL}/seller/activate`);
  const expiry = input.expiresAt ? new Date(input.expiresAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC' : '48 hours';
  const html = emailShell({ preheader: 'Your Auronix seller application has been approved.', title: 'Create your seller account', footerNote: 'For your security, this invitation can be used once and should not be forwarded.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Your application is approved</h1><p>Hello ${escapeHtml(input.name || 'Seller')},</p><p>You can now create your Auronix Commerce seller account. This secure, one-time invitation expires ${input.expiresAt ? `on <strong>${escapeHtml(expiry)}</strong>` : `in <strong>${expiry}</strong>`}.</p>${cta('Create seller account', url)}<p style="color:#6b7280;font-size:13px">If you did not expect this message, contact our team. Never share this link or your password.</p>` });
  return sendNotificationMail({ to: input.email, subject: 'Create your Auronix Commerce seller account', html, text: `Hello ${input.name || 'Seller'},\n\nYour application is approved. Create your account using this one-time link:\n${url}\n\nThe invitation expires ${input.expiresAt ? `on ${expiry}` : 'in 48 hours'}. If you did not expect this message, contact ${SUPPORT_EMAIL}.` });
}

export async function sendPasswordResetEmail(input: { email: string; name?: string; resetUrl: string }) {
  const url = safeAbsoluteUrl(input.resetUrl, `${SITE_URL}/forgot-password`);
  const html = emailShell({ preheader: 'Use this secure link to reset your Auronix password.', title: 'Reset your password', footerNote: 'This security link is time-limited and can only be used once.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Reset your password</h1><p>Hello ${escapeHtml(input.name || 'there')},</p><p>We received a request to reset your Auronix Commerce account password.</p>${cta('Reset password', url)}<p style="color:#6b7280;font-size:13px">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>` });
  return sendNotificationMail({ to: input.email, subject: 'Reset your Auronix Commerce password', html, text: `Hello ${input.name || 'there'},\n\nReset your password using this secure link:\n${url}\n\nIf you did not request this, ignore this email. Contact ${SUPPORT_EMAIL} if you need help.` });
}

export async function sendSellerEmailVerification(input: { email: string; code: string; expiresAt: number }) {
  const expiry = new Date(input.expiresAt).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  const html = emailShell({ preheader: `${input.code} is your seller application verification code.`, title: 'Verify your seller application email', footerNote: 'Never share this verification code. Auronix representatives will not ask you for it.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Verify your email</h1><p>Enter this six-digit code in the Auronix seller application:</p><div style="margin:24px 0;padding:18px;border-radius:14px;background:#f3f4f6;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em">${escapeHtml(input.code)}</div><p>The code expires at <strong>${escapeHtml(expiry)} UTC</strong>.</p>` });
  return sendNotificationMail({ to: input.email, subject: `${input.code} — Verify your Auronix seller application`, html, text: `Your Auronix seller application verification code is ${input.code}. It expires at ${expiry} UTC. Never share this code.` });
}

export async function sendSellerResumeIdEmail(input: { email: string; resumeId: string }) {
  const url = `${SITE_URL}/seller/apply`;
  const html = emailShell({ preheader: 'Your seller application progress has been saved.', title: 'Resume your seller application', footerNote: 'Keep your resume ID private. It provides access to your unfinished application.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Your progress is saved</h1><p>Use the private resume ID below to continue your Auronix seller application:</p><div style="margin:24px 0;padding:18px;border-radius:14px;background:#f3f4f6;text-align:center;font-size:23px;font-weight:800;letter-spacing:.08em">${escapeHtml(input.resumeId)}</div>${cta('Resume application', url)}<p style="color:#6b7280;font-size:13px">If you did not start this application, contact support.</p>` });
  return sendNotificationMail({ to: input.email, subject: 'Resume your Auronix seller application', html, text: `Your seller application progress is saved. Resume at ${url} using private resume ID: ${input.resumeId}.` });
}

export async function sendNewsletterUnsubscribeEmail(input: { email: string; unsubscribeUrl: string; code: string; expiresAt: number }) {
  const url = safeAbsoluteUrl(input.unsubscribeUrl, `${SITE_URL}/newsletter/unsubscribe`);
  const expiry = new Date(input.expiresAt).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  const html = emailShell({ preheader: 'Confirm that you want to stop receiving Auronix Commerce newsletters.', title: 'Confirm newsletter unsubscribe', footerNote: 'This link and verification code expire soon. If you did not request this, no action is required.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Unsubscribe from newsletters?</h1><p>We received a request to stop newsletter emails for <strong>${escapeHtml(input.email)}</strong>.</p>${cta('Review unsubscribe request', url)}<p>Or enter this six-digit confirmation code on the unsubscribe page:</p><div style="margin:22px 0;padding:17px;border-radius:14px;background:#f3f4f6;text-align:center;font-size:30px;font-weight:800;letter-spacing:.22em">${escapeHtml(input.code)}</div><p style="color:#6b7280;font-size:13px">The link and code expire at <strong>${escapeHtml(expiry)} UTC</strong>. You will remain subscribed until you confirm.</p>` });
  return sendNotificationMail({ to: input.email, subject: 'Confirm your Auronix newsletter unsubscribe request', html, text: `Confirm that you want to unsubscribe from Auronix Commerce newsletters:\n${url}\n\nConfirmation code: ${input.code}\nExpires at ${expiry} UTC. If you did not request this, no action is required.` });
}

export async function sendNewsletterOptInEmail(input: { email: string; confirmationUrl: string; expiresAt: number }) {
  const url = safeAbsoluteUrl(input.confirmationUrl, `${SITE_URL}/newsletter/confirm`);
  const expiry = new Date(input.expiresAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
  const html = emailShell({ preheader: 'Confirm your Auronix Commerce newsletter subscription.', title: 'Confirm your newsletter subscription', footerNote: 'You will not receive newsletters unless you confirm. If you did not request this, no action is required.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">One click to confirm</h1><p>Confirm that <strong>${escapeHtml(input.email)}</strong> should receive Auronix Commerce newsletters.</p>${cta('Confirm subscription', url)}<p style="color:#6b7280;font-size:13px">This secure confirmation link expires on <strong>${escapeHtml(expiry)}</strong>.</p>` });
  return sendNotificationMail({ to: input.email, subject: 'Confirm your Auronix Commerce newsletter subscription', html, text: `Confirm your Auronix Commerce newsletter subscription:\n${url}\n\nThis link expires on ${expiry}. If you did not request this, no action is required.` });
}

export async function sendAdminMfaCodeEmail(input: { email: string; code: string; expiresAt: number; device?: string }) {
  const expiry = new Date(input.expiresAt).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  const html = emailShell({ preheader: `${input.code} is your Auronix Admin security code.`, title: 'Admin sign-in verification', footerNote: 'This code protects administrative access. Never share it with anyone, including Auronix support.', body: `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.2">Verify admin sign-in</h1><p>Enter this one-time code to continue signing in${input.device ? ` from <strong>${escapeHtml(input.device)}</strong>` : ''}:</p><div style="margin:24px 0;padding:18px;border-radius:14px;background:#f3f4f6;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em">${escapeHtml(input.code)}</div><p>The code expires at <strong>${escapeHtml(expiry)} UTC</strong>.</p>` });
  return sendNotificationMail({ to: input.email, subject: `${input.code} — Auronix Admin security code`, html, text: `Your Auronix Admin security code is ${input.code}. It expires at ${expiry} UTC. Never share this code.` });
}

export async function sendTicketResponseEmail(input: any, positionalSubject?: string, positionalMessage?: string) {
  if (typeof input === 'string') input = { email: input, subject: positionalSubject, message: positionalMessage };
  const message = String(input.message || input.response || input.body || input.text || '');
  const subject = input.subject || 'Auronix Commerce support response';
  const html = emailShell({ preheader: subject, title: subject, body: `<h1 style="margin:0 0 16px;font-size:24px">Support update</h1><div style="white-space:pre-wrap">${escapeHtml(message)}</div><p style="margin-top:24px;color:#6b7280">Reply to this email if you need further assistance.</p>` });
  return sendBusinessMail({ to: input.email || input.recipient || input.to, subject, html, text: message, replyTo: SUPPORT_EMAIL });
}

export async function verifyMailConnection() {
  if (!SMTP_PASSWORD) throw new Error('Email service is not configured. Set SMTP_PASSWORD.');
  const transporter = nodemailer.createTransport({ connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } });
  await transporter.verify(); return true;
}
