import { adminDb } from "@/lib/firebase-admin";
import {
  account,
  bodyJson,
  DeveloperError,
  fail,
  hash,
  identity,
  json,
  page,
  rateLimit,
  sameOrigin,
  validId,
  wallet,
} from "@/lib/developers/server";
import { parseSpending } from "@/lib/developers/controls";
import {
  configureWebhook,
  deliverEvent,
  queueEvent,
  retryEvent,
  webhookDto,
} from "@/lib/developers/events";
import { randomBytes } from "crypto";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const u = await identity(request);
    await account(u.uid);
    await rateLimit(u.uid, "integrations-read", 60);
    return json({
      wallet: await wallet(u.uid),
      webhook: webhookDto(
        (await adminDb.ref(`aioDeveloperWebhooks/${u.uid}`).get()).val(),
      ),
      deliveries: {
        items: Object.values<any>(
          (
            await adminDb
              .ref(`aioDeveloperEvents/${u.uid}`)
              .orderByChild("createdAt")
              .limitToLast(50)
              .get()
          ).val() || {},
        ).sort((a, b) => b.createdAt - a.createdAt),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const u = await identity(request),
      b = await bodyJson(request, 10_000);
    await account(u.uid, true);
    await rateLimit(u.uid, "integrations-write", 15);
    if (b.action === "spending") {
      let controls: ReturnType<typeof parseSpending>;
      try {
        controls = parseSpending(b.controls);
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
      await adminDb.ref(`aioDeveloperBilling/${u.uid}`).transaction((v) => {
        const next = v || { balance: 0, spent: 0, requests: {}, grants: {} };
        if (
          next.controls?.lowBalanceUnits !== controls.lowBalanceUnits ||
          (!next.controls?.emailAlerts && controls.emailAlerts)
        )
          next.lowBalanceArmed = true;
        next.controls = controls;
        return next;
      });
      return json({
        message:
          "Spending controls saved. Limits apply to all API keys and live playground requests, in UTC.",
      });
    }
    if (b.action === "webhook") {
      try {
        return json(await configureWebhook(u.uid, b));
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
    }
    if (b.action === "test-webhook") {
      await rateLimit(u.uid, "webhook-test", 5);
      const cfg = (
        await adminDb.ref(`aioDeveloperWebhooks/${u.uid}`).get()
      ).val();
      if (!cfg?.enabled)
        throw new DeveloperError(
          "Save and enable your webhook endpoint first.",
        );
      const id = hash(u.uid + randomBytes(20).toString("hex"));
      await queueEvent(u.uid, {
        id,
        type: "endpoint.test",
        createdAt: Date.now(),
        data: { message: "AIO webhook test event" },
      });
      await deliverEvent(id);
      return json({
        message: "Test event queued. Check delivery status below.",
        id,
      });
    }
    if (b.action === "retry-event" && validId(b.id)) {
      try {
        return json(await retryEvent(u.uid, b.id));
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
    }
    throw new DeveloperError("Unknown integration action.");
  } catch (e) {
    return fail(e);
  }
}
