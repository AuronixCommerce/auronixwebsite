import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getMaintenanceContext } from "@/lib/server-maintenance-context";
import { publicStatus } from "@/lib/service-status";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [snapshot, maintenance] = await Promise.all([
      adminDb.ref("serviceStatus").get(),
      getMaintenanceContext("/"),
    ]);
    return NextResponse.json(publicStatus(snapshot.val(), maintenance.global), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Status updates are temporarily unavailable." },
      { status: 503 },
    );
  }
}
