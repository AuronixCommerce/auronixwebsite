import {
  account,
  identity,
  fail,
  sameOrigin,
  requireApiTerms,
} from "@/lib/developers/server";
import { executeCompletion } from "@/lib/developers/completion";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const u = await identity(request);
    requireApiTerms(await account(u.uid, true));
    return await executeCompletion(request, {
      uid: u.uid,
      keyId: "console-playground",
    });
  } catch (error) {
    return fail(error);
  }
}
