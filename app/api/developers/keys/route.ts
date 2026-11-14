import { activityEmail } from "@/lib/email/activity";
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
      const created = await createKey(u.uid, name, permissions);
      await activityEmail({to:u.email,event:"api-key-created",title:"A new AIO API key was created",body:"A new API key was created in your developer account. Review its permissions and revoke it immediately if you did not create it. The secret key is never sent by email.",reference:created.id,href:"/aio/developers/console?tab=keys"});
      return json(created, 201);
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
      await activityEmail({to:u.email,event:"api-key-permissions",title:"Your AIO API key permissions changed",body:"The model, IP or expiry restrictions for an API key were updated. Review the key in your console if you did not make this change.",reference:b.id,revision:Math.floor(Date.now()/60000),href:"/aio/developers/console?tab=keys"});
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
      await activityEmail({to:u.email,event:"api-key-revoked",title:"An AIO API key was revoked",body:"An API key in your account was revoked. New requests using that key will be rejected.",reference:b.id,href:"/aio/developers/console?tab=keys"});
      return json({
        message: "Key revoked. New requests with it will be rejected.",
      });
    }
    throw new DeveloperError("Unknown API key action.");
  } catch (e) {
    return fail(e);
  }
}
