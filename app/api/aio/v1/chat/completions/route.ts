import { apiIdentity, fail } from "@/lib/developers/server";
import { executeCompletion } from "@/lib/developers/completion";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    return await executeCompletion(request, await apiIdentity(request));
  } catch (error) {
    return fail(error);
  }
}
