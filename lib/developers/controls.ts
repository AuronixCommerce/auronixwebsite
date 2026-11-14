import { BlockList, isIP } from "net";
export type SpendingControls = {
  dailyUnits: number | null;
  monthlyUnits: number | null;
  lowBalanceUnits: number;
  emailAlerts: boolean;
};
export const DEFAULT_SPENDING: SpendingControls = {
  dailyUnits: null,
  monthlyUnits: null,
  lowBalanceUnits: 1_000_000,
  emailAlerts: false,
};
export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const monthKey = (t: number) => new Date(t).toISOString().slice(0, 7);
export function parseSpending(v: any): SpendingControls {
  const limit = (n: any) =>
    n === null || (Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000);
  if (
    !v ||
    !limit(v.dailyUnits) ||
    !limit(v.monthlyUnits) ||
    !Number.isSafeInteger(v.lowBalanceUnits) ||
    v.lowBalanceUnits < 0 ||
    v.lowBalanceUnits > 1_000_000_000_000 ||
    typeof v.emailAlerts !== "boolean"
  )
    throw Error(
      "Use valid nonnegative credit amounts; leave spending limits blank for no limit.",
    );
  return {
    dailyUnits: v.dailyUnits,
    monthlyUnits: v.monthlyUnits,
    lowBalanceUnits: v.lowBalanceUnits,
    emailAlerts: v.emailAlerts,
  };
}
export type KeyPermissions = {
  models: string[];
  allowedIps: string[];
  expiresAt: number | null;
};
export const ALL_MODELS = ["aio-one", "aio-2", "aio-2-fast"];
export function parsePermissions(
  v: any = {},
  now = Date.now(),
): KeyPermissions {
  const models: string[] = v.models === undefined ? [...ALL_MODELS] : v.models;
  const allowedIps: string[] = v.allowedIps === undefined ? [] : v.allowedIps;
  const expiresAt = v.expiresAt ?? null;
  if (
    !Array.isArray(models) ||
    !models.length ||
    models.length > 3 ||
    models.some((m) => !ALL_MODELS.includes(m))
  )
    throw Error("Choose at least one supported model.");
  if (
    !Array.isArray(allowedIps) ||
    allowedIps.length > 20 ||
    allowedIps.some((s) => typeof s !== "string" || !validNetwork(s))
  )
    throw Error("Use up to 20 valid IPv4/IPv6 addresses or CIDR ranges.");
  if (
    expiresAt !== null &&
    (!Number.isSafeInteger(expiresAt) ||
      expiresAt <= now ||
      expiresAt > now + 2 * 366 * 86_400_000)
  )
    throw Error(
      "Choose a future key expiry within two years, or leave it empty.",
    );
  return {
    models: Array.from(new Set(models)),
    allowedIps: Array.from(new Set(allowedIps.map((x) => x.trim()))),
    expiresAt,
  };
}
function validNetwork(s: string) {
  const [ip, prefix, extra] = s.trim().split("/"),
    family = isIP(ip);
  return (
    !!family &&
    extra === undefined &&
    (prefix === undefined ||
      (/^\d{1,3}$/.test(prefix) &&
        Number(prefix) >= 0 &&
        Number(prefix) <= (family === 4 ? 32 : 128)))
  );
}
export function ipAllowed(ip: string, networks: string[]) {
  if (!networks.length) return true;
  if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  const family = isIP(ip);
  if (!family) return false;
  const list = new BlockList();
  for (const network of networks) {
    if (!validNetwork(network)) return false;
    const [address, bits] = network.trim().split("/"),
      f = isIP(address) === 4 ? "ipv4" : "ipv6";
    if (bits !== undefined) list.addSubnet(address, Number(bits), f);
    else list.addAddress(address, f);
  }
  return list.check(ip, family === 4 ? "ipv4" : "ipv6");
}
export function requestIp(request: Request) {
  // Vercel overwrites x-forwarded-for at its edge. Fail closed for allowlisted keys on other production hosts.
  if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1")
    return "";
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}
export function spendingState(v: any, now = Date.now()) {
  const day = dayKey(now),
    month = monthKey(now),
    pending = Object.values<any>(v.requests || {}).filter(
      (r) => r.status === "pending",
    );
  return {
    controls: { ...DEFAULT_SPENDING, ...(v.controls || {}) },
    dailySpent: Number(v.spendDays?.[day] || 0),
    monthlySpent: Number(v.spendMonths?.[month] || 0),
    dailyReserved: pending
      .filter((r) => dayKey(r.createdAt) === day)
      .reduce((s, r) => s + r.reserved, 0),
    monthlyReserved: pending
      .filter((r) => monthKey(r.createdAt) === month)
      .reduce((s, r) => s + r.reserved, 0),
    day,
    month,
  };
}
export function updateCounters(
  v: any,
  request: any,
  charge: number,
  now: number,
) {
  v.spendDays ||= {};
  v.spendMonths ||= {};
  const day = dayKey(request.createdAt),
    month = monthKey(request.createdAt);
  v.spendDays[day] = Number(v.spendDays[day] || 0) + charge;
  v.spendMonths[month] = Number(v.spendMonths[month] || 0) + charge;
  for (const key of Object.keys(v.spendDays))
    if (key < dayKey(now - 3 * 86_400_000)) delete v.spendDays[key];
  for (const key of Object.keys(v.spendMonths))
    if (key < monthKey(now - 65 * 86_400_000)) delete v.spendMonths[key];
}
