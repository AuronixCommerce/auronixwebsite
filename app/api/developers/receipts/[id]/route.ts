import { requireAdmin } from "@/lib/server-auth";
import { DeveloperError, validId } from "@/lib/developers/server";
import {
  identity,
  account,
  json,
  fail,
  rateLimit,
} from "@/lib/developers/server";
import { paymentReceipt } from "@/lib/developers/receipt";
import { serverPdf } from "@/lib/documents/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const requested = new URL(request.url).searchParams.get("uid");
    let uid: string, actor: string;
    if (requested) {
      try {
        actor = (await requireAdmin(request)).uid;
      } catch {
        throw new DeveloperError("Administrator access required.", 403);
      }
      if (!validId(requested)) throw new DeveloperError("Invalid account.");
      uid = requested;
    } else {
      const u = await identity(request);
      uid = u.uid;
      actor = u.uid;
    }
    await account(uid);
    await rateLimit(actor, "receipts", 20);
    const bytes = await serverPdf(await paymentReceipt(uid, params.id));
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Auronix-receipt-${params.id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
