import { adminDb } from "@/lib/firebase-admin";
import {
  account,
  bodyJson,
  clean,
  createKey,
  DeveloperError,
  fail,
  identity,
  json,
  page,
  rateLimit,
  sameOrigin,
  validId,
} from "@/lib/developers/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const u = await identity(request);
    await account(u.uid);
    await rateLimit(u.uid, "keys-read", 60);
    return json(
      await page(
        `aioDeveloperKeys/${u.uid}`,
        new URL(request.url).searchParams.get("cursor") || "",
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const u = await identity(request),
      b = await bodyJson(request, 4000);
    await account(u.uid);
    await rateLimit(u.uid, "keys-write", 20);
    if (b.action === "create") {
      await account(u.uid, true);
      const name = clean(b.name, 80);
      if (!name) throw new DeveloperError("Give your key a name.");
      return json(await createKey(u.uid, name), 201);
    }
    if (b.action === "revoke" && validId(b.id)) {
      if (
        !(await adminDb.ref(`aioDeveloperKeys/${u.uid}/${b.id}`).get()).exists()
      )
        throw new DeveloperError("API key not found.", 404);
      await adminDb.ref().update({
        [`aioDeveloperKeyIndex/${b.id}/revokedAt`]: Date.now(),
        [`aioDeveloperKeys/${u.uid}/${b.id}/status`]: "revoked",
      });
      return json({
        message: "Key revoked. New requests with it will be rejected.",
      });
    }
    throw new DeveloperError("Unknown API key action.");
  } catch (e) {
    return fail(e);
  }
}
