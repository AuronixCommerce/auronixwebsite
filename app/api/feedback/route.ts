import { adminDb } from "@/lib/firebase-admin";
import { guard, response, failure, PortalError } from "@/lib/partner/server";
import { text, emailAddress, isEmail } from "@/lib/partner/model";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await guard(request, "website-feedback", body, 6);
    const message = text(body.message, 3000),
      kind = text(body.kind, 40),
      path = text(body.path, 250).split(/[?#]/)[0];
    if (
      message.length < 10 ||
      !["Broken page", "Confusing step", "Suggestion"].includes(kind) ||
      !path.startsWith("/") ||
      path.startsWith("//")
    )
      throw new PortalError("Describe the issue in at least 10 characters.");
    const email = body.contactConsent === true ? emailAddress(body.email) : "";
    if (email && !isEmail(email))
      throw new PortalError("Enter a valid reply email.");
    const ref = adminDb.ref("websiteFeedback").push();
    await ref.set({
      id: ref.key,
      message,
      kind,
      path,
      email,
      status: "new",
      createdAt: Date.now(),
    });
    return response({ success: true, reference: ref.key }, 201);
  } catch (error) {
    return failure(error);
  }
}
