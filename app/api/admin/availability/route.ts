import { userFacingError } from "@/lib/user-facing-error";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb.ref("settings/adminAvailability").get();

    const value = snapshot.exists()
      ? snapshot.val()
      : {
          online: true,
          updatedAt: Date.now(),
        };

    return NextResponse.json({
      online: value?.online !== false,
      updatedAt: value?.updatedAt || null,
      updatedBy: value?.updatedBy || null,
    });
  } catch (error) {
    console.error("Admin availability GET failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : "Unable to load admin availability.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const previous = (
      await adminDb.ref("settings/adminAvailability").get()
    ).val();
    if (body.heartbeat === true && previous?.online !== true)
      return NextResponse.json({ success: true, online: false });
    if (body.heartbeat !== true && typeof body.online !== "boolean")
      return NextResponse.json(
        { error: "Choose online or offline." },
        { status: 400 },
      );
    const online = body.heartbeat === true ? true : body.online;

    const record = {
      online,
      onlineUntil: online ? Date.now() + 5 * 60_000 : 0,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    };

    await adminDb.ref("settings/adminAvailability").set(record);

    return NextResponse.json({
      success: true,
      ...record,
    });
  } catch (error) {
    console.error("Admin availability POST failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : "Unable to update admin availability.",
      },
      { status: 500 },
    );
  }
}
