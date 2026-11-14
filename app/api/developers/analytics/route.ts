import { adminDb } from "@/lib/firebase-admin";
import {
  account,
  fail,
  identity,
  json,
  rateLimit,
} from "@/lib/developers/server";
import { summarizeUsage } from "@/lib/developers/analytics";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const u = await identity(request);
    await account(u.uid);
    await rateLimit(u.uid, "analytics", 30);
    const requested = Number(
        new URL(request.url).searchParams.get("days") || 30,
      ),
      days = [7, 30, 90].includes(requested) ? requested : 30,
      now = Date.now(),
      start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const data =
        (
          await adminDb
            .ref(`aioDeveloperUsage/${u.uid}`)
            .orderByKey()
            .startAt(String(start.getTime()) + "_")
            .limitToLast(10001)
            .get()
        ).val() || {},
      rows = Object.values<any>(data).sort((a, b) => b.createdAt - a.createdAt),
      truncated = rows.length > 10000;
    return json({
      ...summarizeUsage(rows.slice(0, 10000), days, now),
      truncated,
      maximumRows: 10000,
    });
  } catch (e) {
    return fail(e);
  }
}
