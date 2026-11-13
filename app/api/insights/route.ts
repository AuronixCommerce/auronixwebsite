import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import {
  response,
  failure,
  guard,
  PortalError,
  fingerprint,
} from "@/lib/partner/server";
import { EVENT_NAMES, text } from "@/lib/partner/model";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    let consent: any;
    try {
      consent = JSON.parse(cookies().get("auronix_consent")?.value || "{}");
    } catch {}
    if (consent?.a !== true) return response({ recorded: false });
    const body = await request.json();
    await guard(request, "site-insights", body, 150);
    if (
      !EVENT_NAMES.includes(body.event) ||
      !/^[-a-zA-Z0-9]{8,80}$/.test(String(body.session))
    )
      throw new PortalError("Invalid event.");
    const path = text(body.path, 150).split(/[?#]/)[0];
    if (
      ![
        "/supplier",
        "/become-a-supplier",
        "/help",
        "/guide",
        "/guides",
      ].includes(path)
    )
      return response({ recorded: false });
    const video = ["overview", "supplier"].includes(body.video)
      ? body.video
      : "";
    const section = [
      "company",
      "business",
      "documents",
      "commercial",
      "review",
    ].includes(body.section)
      ? body.section
      : "";
    const day = new Date().toISOString().slice(0, 10);
    const key = fingerprint(
      [day, body.session, body.event, path, video, section].join(":"),
    );
    await adminDb
      .ref(`siteInsights/${day}/${key}`)
      .transaction(
        (v) =>
          v || {
            event: body.event,
            session: fingerprint(day + body.session).slice(0, 24),
            path,
            video,
            section,
            createdAt: Date.now(),
          },
      );
    return response({ recorded: true });
  } catch (error) {
    return failure(error);
  }
}
