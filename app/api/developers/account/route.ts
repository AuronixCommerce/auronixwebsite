import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendProfessionalEmail } from "@/lib/server-mail";
import {
  account,
  bodyJson,
  clean,
  DeveloperError,
  fail,
  getPricing,
  identity,
  json,
  page,
  rateLimit,
  sameOrigin,
  wallet,
} from "@/lib/developers/server";
import { protectPublicRequest } from "@/lib/server-protection";
import { pricingReady } from "@/lib/developers/model";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const u = await identity(request, false);
    await rateLimit(u.uid, "console", 60);
    const profile = (
      await adminDb.ref(`aioDeveloperAccounts/${u.uid}`).get()
    ).val();
    const url = new URL(request.url),
      view = url.searchParams.get("view"),
      cursor = url.searchParams.get("cursor") || "";
    if (view === "usage" || view === "invoices") {
      await account(u.uid);
      return json(
        await page(
          view === "usage"
            ? `aioDeveloperUsage/${u.uid}`
            : `aioDeveloperInvoices/${u.uid}`,
          cursor,
        ),
      );
    }
    const pricing = await getPricing();
    const totals = profile
      ? await wallet(u.uid)
      : { balance: 0, spent: 0, reserved: 0 };
    const [usage, invoices] = profile
      ? await Promise.all([
          page(`aioDeveloperUsage/${u.uid}`),
          page(`aioDeveloperInvoices/${u.uid}`),
        ])
      : [
          { items: [], next: "" },
          { items: [], next: "" },
        ];
    const grants = profile
      ? Object.values<any>(
          (
            await adminDb.ref(`aioDeveloperBilling/${u.uid}/grants`).get()
          ).val() || {},
        )
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50)
      : [];
    return json({
      account: profile,
      wallet: totals,
      pricing,
      usage,
      invoices,
      grants,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const b = await bodyJson(request, 12_000),
      u = await identity(request, false);
    await rateLimit(u.uid, "account-actions", 12);
    if (b.action === "verify-email") {
      if (await adminAuth.getUser(u.uid).then((v) => v.emailVerified))
        return json({ message: "Your email is already verified." });
      await rateLimit(u.uid, "verification-email", 3, 3_600_000);
      await rateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        "verification-email-ip",
        10,
        3_600_000,
      );
      const link = await adminAuth.generateEmailVerificationLink(u.email, {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://auronixcommerce.com"}/aio/developers/console`,
      });
      await sendProfessionalEmail(
        {
          to: u.email,
          subject: "Verify your AIO developer account",
          text: `Verify your email to apply for AIO API access:\n\n${link}\n\nIf you did not create an account, ignore this email.`,
        },
        "notification",
      );
      return json({
        message:
          "Verification email accepted for delivery. Open the link, then refresh your account.",
      });
    }
    await identity(request);
    if (b.action === "apply") {
      try {
        await protectPublicRequest(request, "developer-application", b, {
          limit: 5,
          windowMs: 15 * 60_000,
        });
      } catch {
        throw new DeveloperError(
          "Application security check failed or request limit reached. Refresh and retry.",
          429,
        );
      }
      const name = clean(b.name, 120),
        organization = clean(b.organization, 160),
        useCase = clean(b.useCase, 2000),
        website = clean(b.website, 300);
      if (name.length < 2 || useCase.length < 20 || b.accepted !== true)
        throw new DeveloperError(
          "Add your name, describe your use case in at least 20 characters, and accept the API terms.",
        );
      if (website) {
        try {
          if (!["https:", "http:"].includes(new URL(website).protocol))
            throw Error();
        } catch {
          throw new DeveloperError(
            "Use a complete http or https website address.",
          );
        }
      }
      const result = await adminDb
        .ref(`aioDeveloperAccounts/${u.uid}`)
        .transaction((v) =>
          v
            ? undefined
            : {
                uid: u.uid,
                email: u.email,
                name,
                organization,
                useCase,
                website,
                status: "pending",
                createdAt: Date.now(),
                termsAcceptedAt: Date.now(),
                termsVersion: "2026-11-13",
              },
        );
      if (!result.committed)
        throw new DeveloperError(
          "You already have an application. Check its status in your console.",
          409,
        );
      return json({
        message:
          "Application submitted for admin review. API access starts after approval.",
      });
    }
    if (b.action === "invoice") {
      await account(u.uid, true);
      await rateLimit(u.uid, "invoice", 5, 86_400_000);
      const p = await getPricing();
      if (!pricingReady(p))
        throw new DeveloperError(
          "Billing is awaiting published pricing. Contact the team.",
          503,
        );
      if (
        !Number.isSafeInteger(b.credits) ||
        b.credits < 1 ||
        b.credits > 100_000
      )
        throw new DeveloperError(
          "Request between 1 and 100,000 whole credits.",
        );
      const invoice = adminDb.ref(`aioDeveloperInvoices/${u.uid}`).push(),
        now = Date.now();
      const value = {
        id: invoice.key,
        uid: u.uid,
        email: u.email,
        credits: b.credits,
        usdCents: b.credits * p.usdCentsPerCredit,
        pricePerCredit: p.usdCentsPerCredit,
        status: "requested",
        createdAt: now,
      };
      // Owner copy and admin queue are one atomic write.
      await adminDb.ref().update({
        [`aioDeveloperInvoices/${u.uid}/${invoice.key}`]: value,
        [`aioDeveloperInvoiceQueue/${invoice.key}`]: value,
      });
      return json({
        message:
          "Invoice requested. The team will arrange payment; credits are added only after payment is verified.",
        invoice: value,
      });
    }
    throw new DeveloperError("Unknown account action.");
  } catch (e) {
    return fail(e);
  }
}
