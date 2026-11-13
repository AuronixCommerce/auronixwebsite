import { getPricing, json, fail } from "@/lib/developers/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return json({
      pricing: await getPricing(),
      billing: "admin_verified_invoice",
    });
  } catch (e) {
    return fail(e);
  }
}
