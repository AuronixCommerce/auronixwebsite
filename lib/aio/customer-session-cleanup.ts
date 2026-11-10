import { adminDb } from "@/lib/firebase-admin";
export async function cleanupCustomerActionSessions(now = Date.now()) {
  const [flows, rates] = await Promise.all([
    adminDb.ref("aioCustomerWorkflows").get(),
    adminDb.ref("aioActionEmailRates").get(),
  ]);
  const updates: Record<string, null> = {};
  for (const [id, flow] of Object.entries(flows.val() || {}) as [string, any][])
    if (
      flow.expiresAt <= now &&
      !(flow.phase === "executing" && flow.leaseUntil > now)
    )
      updates[`aioCustomerWorkflows/${id}`] = null;
  for (const [id, rate] of Object.entries(rates.val() || {}) as [string, any][])
    if (rate.expiresAt <= now) updates[`aioActionEmailRates/${id}`] = null;
  if (Object.keys(updates).length) await adminDb.ref().update(updates);
  return { removed: Object.keys(updates).length };
}
