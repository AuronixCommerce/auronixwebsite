import { adminDb } from "@/lib/firebase-admin";
import {
  clean,
  CustomerActionError,
  ownsTicket,
  safeId,
  type CustomerIdentity,
  type CustomerActionResult,
} from "@/lib/aio/customer-security";
import type { CustomerActionKind } from "@/lib/aio/customer-actions";
const entries = (value: any): [string, any][] => Object.entries(value || {});
export async function inspectCustomerAction(
  kind: CustomerActionKind,
  identity: CustomerIdentity,
): Promise<CustomerActionResult> {
  const { uid, profile } = identity;
  if (kind === "my_profile")
    return {
      summary: "These are your current account details.",
      records: [
        {
          title: "My profile",
          fields: {
            Name: clean(profile.displayName || profile.name || identity.name),
            Email: identity.email,
            "Business name": clean(profile.businessName),
            Phone: clean(profile.phone),
            Website: clean(profile.website),
          },
        },
      ],
    };
  if (kind === "my_tickets") {
    const tickets = entries((await adminDb.ref("tickets").get()).val())
      .filter(([, t]) => ownsTicket(t, identity))
      .sort(
        ([, a], [, b]) =>
          Number(b.updatedAt || b.createdAt) -
          Number(a.updatedAt || a.createdAt),
      )
      .slice(0, 30);
    return {
      summary: tickets.length
        ? `Found ${tickets.length} recent support tickets for your account.`
        : "Your account has no support tickets yet.",
      records: tickets.map(([id, t]) => ({
        title: clean(t.subject, 150),
        fields: {
          Reference: id,
          Status: clean(t.status, 50),
          Category: clean(t.category, 100),
          "Latest reply": clean(t.lastResponse, 1000),
        },
      })),
    };
  }
  if (kind === "my_application") {
    const id = profile.sellerApplicationId;
    if (!safeId(id))
      throw new CustomerActionError(
        "No application is linked to your account.",
        404,
      );
    const a = (await adminDb.ref(`sellerApplications/${id}`).get()).val();
    const emails = [
      a?.businessEmail,
      a?.personalEmail,
      a?.preferredContactEmail,
      a?.email,
    ].map((x) => clean(x, 320).toLowerCase());
    if (
      !a ||
      !(
        a.uid === uid ||
        a.sellerUid === uid ||
        (identity.emailVerified && emails.includes(identity.email))
      )
    )
      throw new CustomerActionError(
        "Verify your application email using Track an application.",
        403,
      );
    return {
      summary: "This is the current status of your linked application.",
      reference: clean(a.trackingId || id),
      records: [
        {
          title: clean(a.businessName),
          fields: {
            Status: clean(a.status),
            "Tracking ID": clean(a.trackingId || id),
            "Review message": clean(a.reviewMessage, 2000),
          },
        },
      ],
    };
  }
  if (kind === "my_products" || kind === "my_catalogs") {
    const key = kind === "my_products" ? "products" : "catalogs",
      items = entries(
        (await adminDb.ref(`sellerData/${uid}/${key}`).get()).val(),
      )
        .sort(
          ([, a], [, b]) =>
            Number(b.updatedAt || b.createdAt) -
            Number(a.updatedAt || a.createdAt),
        )
        .slice(0, 30);
    return {
      summary: `Your account has ${items.length} recent ${key}.`,
      records: items.map(([id, p]) => ({
        title: clean(p.name || p.title, 180),
        fields: {
          Reference: id,
          ...(key === "products"
            ? { SKU: clean(p.sku), Status: clean(p.status || "draft") }
            : { URL: clean(p.url, 500) }),
          Description: clean(p.description, 1000),
        },
      })),
    };
  }
  if (kind === "my_notifications") {
    const rows = entries(
      (await adminDb.ref(`sellerNotifications/${uid}`).get()).val(),
    )
      .sort(([, a], [, b]) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 30);
    return {
      summary: `Found ${rows.length} recent account notifications.`,
      records: rows.map(([, n]) => ({
        title: clean(n.title, 180),
        fields: {
          Message: clean(n.message, 1000),
          Read: n.readAt ? "Yes" : "No",
        },
      })),
    };
  }
  throw new CustomerActionError("Choose a supported account lookup.");
}
