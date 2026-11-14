import {
  DEFAULT_SPENDING,
  spendingState,
  updateCounters,
  ipAllowed,
  requestIp,
  type KeyPermissions,
} from "./controls";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_API_PRICING,
  CREDIT_UNITS,
  API_TERMS_VERSION,
  type ApiPricing,
} from "./model";
export class DeveloperError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "invalid_request",
  ) {
    super(message);
  }
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const validId = (s: unknown): s is string =>
  typeof s === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(s);
export const clean = (s: unknown, n = 1000) =>
  typeof s === "string" ? s.trim().slice(0, n) : "";
export function json(
  data: any,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
}
export function fail(error: unknown) {
  if (error instanceof DeveloperError)
    return json(
      { error: { message: error.message, type: error.code } },
      error.status,
      error.status === 429 ? { "Retry-After": "60" } : {},
    );
  console.error(
    "[AIO API] Operation failed",
    error instanceof Error ? error.name : "Error",
  );
  return json(
    {
      error: {
        message: "This service is temporarily unavailable. Please retry.",
        type: "service_unavailable",
      },
    },
    503,
  );
}
export async function bodyJson(request: Request, max = 100_000) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new DeveloperError("Use Content-Type: application/json.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DeveloperError("Send a JSON request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new DeveloperError("Request body is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new DeveloperError("Send a JSON object.");
    return value;
  } catch (error) {
    if (error instanceof DeveloperError) throw error;
    throw new DeveloperError("Send valid JSON.");
  }
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new DeveloperError("Refresh the page and try again.", 403);
}
export async function identity(request: Request, verified = true) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192)
    throw new DeveloperError(
      "Sign in to your developer account.",
      401,
      "authentication_required",
    );
  let user;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    user = await adminAuth.getUser(decoded.uid);
  } catch {
    throw new DeveloperError(
      "Your sign-in session expired. Sign in again.",
      401,
      "authentication_required",
    );
  }
  const profile = (await adminDb.ref(`users/${user.uid}`).get()).val();
  if (user.disabled || ["disabled", "suspended"].includes(profile?.status))
    throw new DeveloperError(
      "Account access is disabled. Contact support.",
      403,
    );
  if (!user.email || (verified && !user.emailVerified))
    throw new DeveloperError(
      "Verify your email before applying for API access.",
      403,
      "email_verification_required",
    );
  return {
    uid: user.uid,
    email: user.email.toLowerCase(),
    name: user.displayName || "",
  };
}
export async function rateLimit(
  uid: string,
  scope: string,
  limit: number,
  windowMs = 60_000,
) {
  const bucket = Math.floor(Date.now() / windowMs);
  const r = await adminDb
    .ref(`aioDeveloperRateLimits/${scope}/${hash(uid)}`)
    .transaction((v) => {
      const next =
        v?.bucket === bucket
          ? { ...v, count: v.count + 1 }
          : { bucket, count: 1 };
      return next;
    });
  if (r.snapshot.val().count > limit)
    throw new DeveloperError(
      "Too many requests. Please wait a minute.",
      429,
      "rate_limit_exceeded",
    );
}
export async function getPricing(): Promise<ApiPricing> {
  const data = (await adminDb.ref("settings/aioDeveloperApi").get()).val();
  const unpublished =
    !data ||
    (Number(data.usdCentsPerCredit || 0) === 0 &&
      Object.values<any>(data.rates || {}).every((r) => !r.input && !r.output));
  if (unpublished) return structuredClone(DEFAULT_API_PRICING);
  return {
    ...DEFAULT_API_PRICING,
    ...(data || {}),
    rates: { ...DEFAULT_API_PRICING.rates, ...(data?.rates || {}) },
  };
}
export async function account(uid: string, approved = false) {
  const value = (await adminDb.ref(`aioDeveloperAccounts/${uid}`).get()).val();
  if (!value)
    throw new DeveloperError(
      "Submit your developer application first.",
      403,
      "application_required",
    );
  if (approved && value.status !== "approved")
    throw new DeveloperError(
      "Your developer account must be approved and active.",
      403,
      "account_not_approved",
    );
  return value;
}
export async function apiIdentity(request: Request) {
  const raw = request.headers
    .get("authorization")
    ?.match(/^Bearer (aio_live_[a-f0-9]{32}_[a-f0-9]{48})$/)?.[1];
  if (!raw)
    throw new DeveloperError(
      "Provide a valid AIO API key as a Bearer token.",
      401,
      "invalid_api_key",
    );
  const id = raw.split("_")[2];
  const value = (await adminDb.ref(`aioDeveloperKeyIndex/${id}`).get()).val();
  if (
    !value ||
    value.revokedAt ||
    typeof value.hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.hash) ||
    !timingSafeEqual(
      Buffer.from(value.hash, "hex"),
      Buffer.from(hash(raw), "hex"),
    )
  )
    throw new DeveloperError(
      "This API key is invalid or revoked.",
      401,
      "invalid_api_key",
    );
  if (value.permissions?.expiresAt && value.permissions.expiresAt <= Date.now())
    throw new DeveloperError(
      "This API key has expired.",
      401,
      "expired_api_key",
    );
  if (!ipAllowed(requestIp(request), value.permissions?.allowedIps || []))
    throw new DeveloperError(
      "This IP address is not allowed for this API key.",
      403,
      "ip_not_allowed",
    );
  requireApiTerms(await account(value.uid, true));
  // A suspended Firebase account cannot keep using previously issued API keys.
  const user = await adminAuth.getUser(value.uid).catch(() => null);
  const profileStatus = (
    await adminDb.ref(`users/${value.uid}/status`).get()
  ).val();
  if (
    !user ||
    user.disabled ||
    !user.emailVerified ||
    ["disabled", "suspended"].includes(profileStatus)
  )
    throw new DeveloperError(
      "Account access is disabled.",
      403,
      "account_disabled",
    );
  return {
    uid: value.uid as string,
    keyId: id,
    models: value.permissions?.models as string[] | undefined,
  };
}
export async function createKey(
  uid: string,
  name: string,
  permissions: KeyPermissions = {
    models: ["aio-one", "aio-2", "aio-2-fast"],
    allowedIps: [],
    expiresAt: null,
  },
) {
  const id = randomBytes(16).toString("hex"),
    secret = `aio_live_${id}_${randomBytes(24).toString("hex")}`,
    now = Date.now();
  await adminDb.ref().update({
    [`aioDeveloperKeyIndex/${id}`]: {
      uid,
      hash: hash(secret),
      createdAt: now,
      permissions,
    },
    [`aioDeveloperKeys/${uid}/${id}`]: {
      id,
      name,
      prefix: secret.slice(0, 20) + "…",
      createdAt: now,
      status: "active",
      permissions,
    },
  });
  return { secret, id };
}
// All balance changes, holds, account-wide rate limits, and grant deduplication are serialized here.
// Terminal request records are archived before pruning. Unarchived records are never discarded.
export function recoverHolds(value: any, now: number) {
  const v = value || { balance: 0, spent: 0, requests: {}, grants: {} };
  v.requests ||= {};
  v.grants ||= {};
  for (const [id, r] of Object.entries<any>(v.requests)) {
    if (r.status === "pending" && r.expiresAt < now) {
      v.balance += r.reserved;
      v.requests[id] = { ...r, status: "expired", charged: 0, finishedAt: now };
    } else if (
      r.status !== "pending" &&
      r.archivedAt &&
      r.createdAt < now - 86_400_000
    )
      delete v.requests[id];
  }
  return v;
}
export async function reserve(
  uid: string,
  id: string,
  amount: number,
  model: string,
  keyId: string,
  rpm: number,
  fingerprint: string,
  rates?: { input: number; output: number },
) {
  const now = Date.now();
  // Claims live outside the wallet: every billing transaction touches only active holds,
  // not an entire day of completed requests. A separate bounded cron query expires claims.
  const claim = await adminDb
    .ref(`aioDeveloperRequestClaims/${hash(uid + ":" + id)}`)
    .transaction((v) => {
      if (v && v.expiresAt > now) return;
      return { expiresAt: now + 86_400_000 };
    });
  if (!claim.committed)
    throw new DeveloperError(
      "This Idempotency-Key has already been used. Check usage before retrying with a new key.",
      409,
      "duplicate_request",
    );
  let reason = "";
  const result = await adminDb
    .ref(`aioDeveloperBilling/${uid}`)
    .transaction((current) => {
      reason = "";
      const v = recoverHolds(current, now);
      if (v.requests[id]) {
        reason = "duplicate";
        return;
      }
      const budget = spendingState(v, now);
      if (
        budget.controls.dailyUnits !== null &&
        budget.dailySpent + budget.dailyReserved + amount >
          budget.controls.dailyUnits
      ) {
        reason = "daily_limit";
        return;
      }
      if (
        budget.controls.monthlyUnits !== null &&
        budget.monthlySpent + budget.monthlyReserved + amount >
          budget.controls.monthlyUnits
      ) {
        reason = "monthly_limit";
        return;
      }
      const minute = Math.floor(now / 60_000),
        count = v.minute === minute ? Number(v.minuteCount || 0) : 0;
      if (count >= rpm) {
        reason = "rate";
        return;
      }
      if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        !Number.isSafeInteger(v.balance) ||
        v.balance < amount
      ) {
        reason = "balance";
        return;
      }
      if (
        Object.values<any>(v.requests).filter((r) => r.status === "pending")
          .length >= 5
      ) {
        reason = "concurrent";
        return;
      }
      v.balance -= amount;
      v.minute = minute;
      v.minuteCount = count + 1;
      v.requests[id] = {
        id,
        keyId,
        model,
        fingerprint,
        rates: rates || null,
        reserved: amount,
        charged: 0,
        status: "pending",
        createdAt: now,
        expiresAt: now + 120_000,
      };
      return v;
    });
  if (!result.committed) {
    if (reason === "daily_limit" || reason === "monthly_limit")
      throw new DeveloperError(
        `Account ${reason === "daily_limit" ? "daily" : "monthly"} spending limit reached. Limits include active request holds and reset in UTC.`,
        402,
        reason,
      );
    if (reason === "duplicate")
      throw new DeveloperError(
        "This Idempotency-Key has already been used. Check usage before retrying with a new key.",
        409,
        "duplicate_request",
      );
    if (reason === "rate" || reason === "concurrent")
      throw new DeveloperError(
        "Account request limit reached. Retry later.",
        429,
        "rate_limit_exceeded",
      );
    throw new DeveloperError(
      "Insufficient available credits for the maximum request cost. Add credits or lower the output limit.",
      402,
      "insufficient_credits",
    );
  }
}
export async function settle(
  uid: string,
  id: string,
  usage?: { prompt_tokens: number; completion_tokens: number },
  charge = 0,
  metadata: {
    durationMs?: number;
    errorCode?: string;
    statusCode?: number;
  } = {},
) {
  const now = Date.now();
  const result = await adminDb
    .ref(`aioDeveloperBilling/${uid}`)
    .transaction((current) => {
      if (!current?.requests?.[id] || current.requests[id].status !== "pending")
        return;
      const r = current.requests[id];
      if (!Number.isSafeInteger(charge) || charge < 0 || charge > r.reserved)
        return;
      current.balance += r.reserved - charge;
      current.spent = Number(current.spent || 0) + charge;
      updateCounters(current, r, charge, now);
      const controls = { ...DEFAULT_SPENDING, ...(current.controls || {}) };
      const actualBalance =
        current.balance +
        Object.values<any>(current.requests)
          .filter((p) => p.status === "pending" && p.id !== id)
          .reduce((s, p) => s + p.reserved, 0);
      if (
        usage &&
        actualBalance <= controls.lowBalanceUnits &&
        current.lowBalanceArmed !== false
      ) {
        current.pendingEvents ||= {};
        current.hasPendingEvents = true;
        const eventId = hash(uid + ":balance:" + id);
        current.pendingEvents[eventId] = {
          id: eventId,
          type: "balance.low",
          createdAt: now,
          email: controls.emailAlerts,
          data: {
            balance_units: actualBalance,
            threshold_units: controls.lowBalanceUnits,
            units_per_credit: CREDIT_UNITS,
          },
        };
        current.lowBalanceArmed = false;
      }
      current.requests[id] = {
        ...r,
        status: usage ? "completed" : "failed",
        charged: charge,
        usage: usage || null,
        finishedAt: now,
        ...metadata,
      };
      return current;
    });
  if (!result.committed)
    throw new DeveloperError(
      "This request could not be settled. No answer was released; check usage or contact support.",
      503,
      "settlement_failed",
    );
  await archiveRequests(uid, result.snapshot.val()).catch(() => undefined);
  return result.snapshot.val().balance as number;
}
export async function archiveRequests(uid: string, billing: any) {
  // Atomic archive + removal keeps settled history out of the hot wallet.
  // Failed archives leave the terminal record intact for recovery.
  const updates: Record<string, any> = {};
  for (const [id, r] of Object.entries<any>(billing?.requests || {}))
    if (r.status !== "pending" && !r.archivedAt) {
      const { fingerprint, ...record } = r;
      updates[`aioDeveloperUsage/${uid}/${r.createdAt}_${id}`] = {
        ...record,
        requestId: id,
      };
      updates[`aioDeveloperBilling/${uid}/requests/${id}`] = null;
    }
  if (Object.keys(updates).length) await adminDb.ref().update(updates);
}
export async function wallet(uid: string) {
  const result = await adminDb
    .ref(`aioDeveloperBilling/${uid}`)
    .transaction((v) => recoverHolds(v, Date.now()));
  const billing = result.snapshot.val();
  await archiveRequests(uid, billing);
  return {
    ...spendingState(billing),
    balance: billing.balance,
    spent: billing.spent,
    reserved: Object.values<any>(billing.requests || {}).reduce(
      (s, r) => s + (r.status === "pending" ? r.reserved : 0),
      0,
    ),
  };
}
export async function grant(
  uid: string,
  id: string,
  units: number,
  actorUid: string,
  reference: string,
  reason: string,
  event?: any,
) {
  if (
    !validId(id) ||
    !Number.isSafeInteger(units) ||
    units < 1 ||
    units > 1_000_000 * CREDIT_UNITS ||
    !reference ||
    !reason
  )
    throw new DeveloperError(
      "Enter a valid credit amount, a unique payment reference, and a reason.",
    );
  const result = await adminDb
    .ref(`aioDeveloperBilling/${uid}`)
    .transaction((current) => {
      const v = recoverHolds(current, Date.now());
      if (v.grants[id] || v.references?.[hash(reference.toLowerCase())]) return;
      if (!Number.isSafeInteger(v.balance + units)) return;
      v.references ||= {};
      v.references[hash(reference.toLowerCase())] = id;
      v.balance += units;
      if (event) {
        v.pendingEvents ||= {};
        v.hasPendingEvents = true;
        v.pendingEvents[event.id] = event;
      }
      if (
        v.balance +
          Object.values<any>(v.requests || {})
            .filter((r) => r.status === "pending")
            .reduce((sum, r) => sum + r.reserved, 0) >
        { ...DEFAULT_SPENDING, ...(v.controls || {}) }.lowBalanceUnits
      )
        v.lowBalanceArmed = true;
      v.grants[id] = {
        id,
        units,
        actorUid,
        reference,
        reason,
        createdAt: Date.now(),
      };
      return v;
    });
  if (!result.committed)
    throw new DeveloperError(
      "This payment reference has already been credited, or the wallet limit was reached.",
      409,
      "duplicate_credit",
    );
  return result.snapshot.val().balance;
}
export async function page(path: string, cursor = "", limit = 50) {
  if (cursor && !validId(cursor))
    throw new DeveloperError("Invalid page cursor.");
  let q = adminDb.ref(path).orderByKey();
  if (cursor) q = q.endAt(cursor);
  const data =
    (await q.limitToLast(limit + 1 + (cursor ? 1 : 0)).get()).val() || {};
  const items = Object.entries<any>(data)
    .filter(([id]) => id !== cursor)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([id, v]) => ({ ...v, id }));
  return {
    items: items.slice(0, limit),
    next: items.length > limit ? items[limit - 1].id : "",
  };
}

export function requireApiTerms(profile: any) {
  if (profile.termsVersion !== API_TERMS_VERSION)
    throw new DeveloperError(
      "Accept the current API Terms in your developer console before making requests.",
      403,
      "api_terms_required",
    );
}
