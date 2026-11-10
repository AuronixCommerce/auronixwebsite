import { NextResponse } from "next/server";
import { customerWorkflowRequest } from "@/lib/aio/customer-workflows";
import {
  CustomerActionError,
  customerIdentity,
} from "@/lib/aio/customer-security";
import { CUSTOMER_ACTIONS } from "@/lib/aio/customer-actions";
import { DEFAULT_AIO_SETTINGS } from "@/lib/aio/settings";
import { adminDb } from "@/lib/firebase-admin";
import {
  protectPublicRequest,
  publicRequestErrorResponse,
} from "@/lib/server-protection";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const identity = await customerIdentity(request);
    const settings = {
      ...DEFAULT_AIO_SETTINGS,
      ...((await adminDb.ref("settings/ai").get()).val() || {}),
    };
    return NextResponse.json(
      {
        signedIn: !!identity,
        defaults: identity
          ? {
              email: identity.email,
              name: identity.name,
              displayName: identity.name,
              businessName: String(identity.profile.businessName || ""),
              phone: String(identity.profile.phone || ""),
              website: String(identity.profile.website || ""),
            }
          : {},
        actions: Object.entries(CUSTOMER_ACTIONS)
          .filter(
            ([kind]) =>
              settings.customerActionsEnabled !== false &&
              settings.enabled !== false &&
              settings.publicChatEnabled !== false &&
              (!kind.startsWith("newsletter_") ||
                settings.customerNewsletterEnabled !== false) &&
              (![
                "supplier_apply",
                "seller_apply",
                "application_track",
              ].includes(kind) ||
                settings.customerApplicationsEnabled !== false) &&
              (!["email_me", "support_create"].includes(kind) ||
                settings.customerEmailEnabled !== false),
          )
          .map(([id, a]) => ({ id, title: a.title, account: a.account })),
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load customer actions. Sign in again if needed." },
      { status: 401, headers },
    );
  }
}
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 25 * 1024 * 1024)
      return NextResponse.json(
        { error: "Uploads exceed the allowed size." },
        { status: 413, headers },
      );
    const files = request.headers
      .get("content-type")
      ?.includes("multipart/form-data")
      ? await request.formData()
      : undefined;
    const body = files
      ? Object.fromEntries(
          Array.from(files.entries()).filter(([, v]) => typeof v === "string"),
        )
      : await request.json();
    if (files && body.confirmed === "true") body.confirmed = true;
    await protectPublicRequest(request, "aio-customer-actions", body, {
      limit: 60,
      windowMs: 15 * 60_000,
    });
    return NextResponse.json(
      await customerWorkflowRequest(request, body, files),
      { headers },
    );
  } catch (error) {
    const blocked = publicRequestErrorResponse(error);
    if (blocked)
      return NextResponse.json(blocked.body, {
        status: blocked.status,
        headers,
      });
    if (error instanceof CustomerActionError)
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status, headers },
      );
    return NextResponse.json(
      {
        success: false,
        error:
          "We could not complete this action. Your confirmation is required before any change. Please retry.",
      },
      { status: 503, headers },
    );
  }
}
