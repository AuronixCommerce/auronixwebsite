import { adminDb } from "@/lib/firebase-admin";
import { fail, json } from "@/lib/developers/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data =
      (
        await adminDb.ref("aioApiNotices").orderByKey().limitToLast(100).get()
      ).val() || {};
    return json({
      notices: Object.entries<any>(data)
        .filter(([, n]) => n.published === true)
        .map(([id, n]) => ({
          id,
          title: n.title,
          body: n.body,
          version: n.version,
          type: n.type,
          effectiveAt: n.effectiveAt,
          createdAt: n.createdAt,
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    });
  } catch (e) {
    return fail(e);
  }
}
