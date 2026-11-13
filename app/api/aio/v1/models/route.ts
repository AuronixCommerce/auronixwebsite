import { DEVELOPER_MODELS } from "@/lib/developers/model";
import { apiIdentity, fail, json, rateLimit } from "@/lib/developers/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const u = await apiIdentity(request);
    await rateLimit(u.uid, "models", 60);
    return json({
      object: "list",
      data: DEVELOPER_MODELS.map((m) => ({
        id: m.id,
        object: "model",
        owned_by: "auronix",
        description: m.description,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
