import { parsePermissions } from "@/lib/developers/controls";
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
      let permissions;
      try {
        permissions = parsePermissions(b.permissions);
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
      return json(await createKey(u.uid, name, permissions), 201);
    }
    if (b.action === "permissions" && validId(b.id)) {
      await account(u.uid, true);
      const own = (
        await adminDb.ref(`aioDeveloperKeys/${u.uid}/${b.id}`).get()
      ).val();
      if (!own || own.status !== "active")
        throw new DeveloperError("Active API key not found.", 404);
      let permissions;
      try {
        permissions = parsePermissions(b.permissions);
      } catch (e) {
        throw new DeveloperError((e as Error).message);
      }
      await adminDb.ref().update({
        [`aioDeveloperKeyIndex/${b.id}/permissions`]: permissions,
        [`aioDeveloperKeys/${u.uid}/${b.id}/permissions`]: permissions,
      });
      return json({ message: "Key permissions updated." });
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
