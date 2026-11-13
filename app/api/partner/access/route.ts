import { access, failure } from "@/lib/partner/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    return await access(request);
  } catch (error) {
    return failure(error);
  }
}
