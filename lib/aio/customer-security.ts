import { createHash, createHmac, timingSafeEqual } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { DEFAULT_AIO_SETTINGS } from "@/lib/aio/settings";
import {
  CUSTOMER_ACTIONS,
  type CustomerActionKind,
} from "@/lib/aio/customer-actions";
export class CustomerActionError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "ACTION_REJECTED",
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const safeId = (value: unknown) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
export type CustomerIdentity = {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: string;
  profile: Record<string, any>;
};
export async function customerIdentity(
  request: Request,
): Promise<CustomerIdentity | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer "))
    throw new CustomerActionError("Sign in again to use your account.", 401);
  let user;
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7).trim(), true);
    user = await adminAuth.getUser(decoded.uid);
  } catch {
    throw new CustomerActionError(
      "Your sign-in session expired. Sign in again.",
      401,
    );
  }
  const profile = (await adminDb.ref(`users/${user.uid}`).get()).val() || {};
  if (
    user.disabled ||
    ["disabled", "suspended"].includes(String(profile.status))
  )
    throw new CustomerActionError(
      "This account cannot use customer actions. Contact support.",
      403,
    );
  return {
    uid: user.uid,
    email: String(user.email || "")
      .trim()
      .toLowerCase(),
    name: String(user.displayName || profile.displayName || profile.name || ""),
    emailVerified: user.emailVerified === true,
    role: String(profile.role || "customer"),
    profile,
  };
}
export function requireCustomer(
  identity: CustomerIdentity | null,
  kind: CustomerActionKind,
) {
  if (CUSTOMER_ACTIONS[kind].account && !identity)
    throw new CustomerActionError(
      "Sign in to use this account action.",
      401,
      "SIGN_IN_REQUIRED",
    );
  if (
    [
      "product_draft",
      "catalog_add",
      "my_products",
      "my_catalogs",
      "my_application",
      "my_notifications",
    ].includes(kind) &&
    identity &&
    !["seller", "admin"].includes(identity.role)
  )
    throw new CustomerActionError(
      "This action is available to approved seller accounts.",
      403,
    );
}
export async function allowCustomerAction(kind: CustomerActionKind) {
  const settings = {
    ...DEFAULT_AIO_SETTINGS,
    ...((await adminDb.ref("settings/ai").get()).val() || {}),
  };
  if (
    settings.enabled === false ||
    settings.publicChatEnabled === false ||
    settings.customerActionsEnabled === false
  )
    throw new CustomerActionError(
      "Chat actions are temporarily unavailable. You can use the dedicated pages.",
      503,
    );
  if (
    kind.startsWith("newsletter_") &&
    settings.customerNewsletterEnabled === false
  )
    throw new CustomerActionError(
      "Newsletter actions are currently available on the newsletter pages.",
      503,
    );
  if (
    ["supplier_apply", "seller_apply", "application_track"].includes(kind) &&
    settings.customerApplicationsEnabled === false
  )
    throw new CustomerActionError(
      "Application actions are currently available on the application pages.",
      503,
    );
  if (
    ["email_me", "support_create"].includes(kind) &&
    settings.customerEmailEnabled === false
  )
    throw new CustomerActionError(
      "Email actions are temporarily unavailable in chat.",
      503,
    );
}
export function otpHash(id: string, email: string, code: string) {
  const secret =
    process.env.EMAIL_QUEUE_KEY ||
    process.env.AURONIX_VERIFY_SECRET ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!secret)
    throw new CustomerActionError(
      "Email verification is temporarily unavailable.",
      503,
    );
  return createHmac("sha256", secret)
    .update(`${id}:${email}:${code}`)
    .digest("hex");
}
export function equalHash(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex"),
      b = Buffer.from(right, "hex");
    return a.length === 32 && a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
export const maskedEmail = (email: string) =>
  email.replace(/^(.{1,2})[^@]*(@.*)$/, "$1••••$2");
export function ownsTicket(ticket: any, identity: CustomerIdentity) {
  return (
    ticket && (ticket.sellerUid === identity.uid || ticket.uid === identity.uid)
  );
}
export const clean = (value: unknown, max = 500) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
export type CustomerActionResult = {
  summary: string;
  reference?: string;
  href?: string;
  emailStatus?: "sent" | "queued" | "failed";
  records?: Array<{ title: string; fields: Record<string, string> }>;
};
