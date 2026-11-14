import { drainDeveloperEvents } from "@/lib/developers/events";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ processed: await drainDeveloperEvents(20) });
  } catch {
    return NextResponse.json(
      { error: "Delivery worker unavailable." },
      { status: 503 },
    );
  }
}
