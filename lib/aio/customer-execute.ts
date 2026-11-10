import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { sendProfessionalEmail, SUPPORT_EMAIL } from "@/lib/server-mail";
import { inheritPublicRequestVerification } from "@/lib/server-protection";
import { submitSupplierApplication } from "@/lib/supplier-application-service";
import { submitSellerApplication } from "@/lib/seller-application-service";
import { trackingHash } from "@/lib/seller-tracking";
import {
  clean,
  digest,
  ownsTicket,
  safeId,
  CustomerActionError,
  type CustomerIdentity,
  type CustomerActionResult,
} from "@/lib/aio/customer-security";
import type { CustomerActionKind } from "@/lib/aio/customer-actions";
export type CustomerWorkflow = {
  id: string;
  kind: CustomerActionKind;
  uid: string | null;
  email: string;
  input: Record<string, any>;
  context?: Record<string, any>;
  createdAt: number;
  saveHistory?: boolean;
  conversationId?: string;
};
function internalRequest(request: Request, path: string, body: any) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("Content-Type", "application/json");
  return inheritPublicRequestVerification(
    request,
    new Request(new URL(path, request.url), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}
async function responseData(response: Response) {
  const data = await response.json();
  if (!response.ok)
    throw new CustomerActionError(
      data.error || "We could not submit this request.",
      response.status,
    );
  return data;
}
const topics = (input: any) => ({
  company: input.company === true,
  sourcing: input.sourcing === true,
  sellers: input.sellers === true,
  suppliers: input.suppliers === true,
});
async function newsletter(
  workflow: CustomerWorkflow,
): Promise<CustomerActionResult> {
  const { kind, email, input, id } = workflow,
    now = Date.now();
  const all = (await adminDb.ref("newsletterSubscribers").get()).val() || {};
  const matches = Object.entries(all).filter(
    ([, v]: any) =>
      String(v.email || "")
        .trim()
        .toLowerCase() === email,
  ) as [string, any][];
  if (kind === "newsletter_unsubscribe") {
    for (const [key] of matches)
      await adminDb.ref(`newsletterSubscribers/${key}`).update({
        active: false,
        pendingConfirmation: false,
        confirmationTokenHash: null,
        unsubscribedAt: now,
        unsubscribeReason: input.reason || "prefer_not_to_say",
        updatedAt: now,
      });
    await adminDb.ref(`newsletterUnsubscribeReasons/aio-${id}`).set({
      email,
      reason: input.reason || "prefer_not_to_say",
      method: "aio-email-otp",
      createdAt: now,
    });
    return {
      summary:
        "Newsletter messages are now turned off for your verified email. Essential account and security messages may still be sent.",
    };
  }
  if (
    kind === "newsletter_preferences" &&
    !matches.some(([, v]) => v.active === true)
  )
    throw new CustomerActionError(
      "This verified email is not subscribed. Choose Subscribe to updates first.",
      409,
    );
  if (
    matches.some(
      ([, v]) =>
        v.suppressed === true &&
        ["bounced", "complained"].includes(v.suppressionReason),
    )
  )
    throw new CustomerActionError(
      "This address needs a delivery review. Please contact support before subscribing.",
      409,
    );
  const ids = matches.length
    ? matches.map(([key]) => key)
    : [`aio-${digest(email)}`];
  for (const key of ids) {
    const old = all[key] || {};
    await adminDb.ref(`newsletterSubscribers/${key}`).update({
      id: key,
      email,
      name: input.name || old.name || "",
      active: true,
      pendingConfirmation: false,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
      confirmedAt: now,
      confirmedVia: "aio-email-otp",
      frequency: input.frequency,
      topics: topics(input),
      source: old.source || "aio-chat",
      unsubscribeToken: old.unsubscribeToken || randomBytes(32).toString("hex"),
      createdAt: old.createdAt || now,
      updatedAt: now,
      ...(kind === "newsletter_subscribe"
        ? {
            consentAt: now,
            consentSource: "aio-chat-explicit-opt-in",
            suppressed: false,
          }
        : {}),
    });
  }
  await adminDb.ref(`newsletterEvents/aio-${id}`).set({
    type: kind === "newsletter_subscribe" ? "confirmed" : "preferences_updated",
    subscriberId: ids[0],
    createdAt: now,
    method: "aio-email-otp",
  });
  return {
    summary:
      kind === "newsletter_subscribe"
        ? "Your email is verified and your newsletter subscription is active."
        : "Your newsletter topics and email frequency have been updated.",
  };
}
export async function executeCustomerAction(
  workflow: CustomerWorkflow,
  identity: CustomerIdentity | null,
  request: Request,
  files?: FormData,
): Promise<CustomerActionResult> {
  const { kind, input, email, id } = workflow,
    now = Date.now();
  if (kind.startsWith("newsletter_")) return newsletter(workflow);
  if (kind === "supplier_apply") {
    const form = new FormData();
    for (const [k, v] of Object.entries(input)) form.set(k, String(v));
    form.set("turnstileToken", String((workflow as any).turnstileToken || ""));
    for (const key of ["catalogFile", "authorizationFile"]) {
      const file = files?.get(key);
      if (file && typeof file !== "string" && file.size) form.set(key, file);
    }
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("content-type");
    const child = inheritPublicRequestVerification(
      request,
      new Request(new URL("/api/supplier/apply", request.url), {
        method: "POST",
        headers,
        body: form,
      }),
    );
    const result = await responseData(
      await submitSupplierApplication(child, id),
    );
    return {
      summary:
        "Your supplier application was submitted for review. This does not approve or activate a supplier account.",
      reference: result.submissionId,
      href: "/supplier",
    };
  }
  if (kind === "seller_apply") {
    const draftId = `aio-${id}`,
      resumeId = String(workflow.context?.sellerResumeId || ""),
      ref = adminDb.ref(`sellerApplicationDrafts/${draftId}`),
      previous = (await ref.get()).val();
    if (previous?.status === "submitted")
      return {
        summary: "Your seller application is submitted and awaiting review.",
        reference: previous.trackingId,
        href: "/seller/application/track",
      };
    await ref.set({
      id: draftId,
      status: "draft",
      form: input,
      resumeCodeHash: digest(resumeId.toUpperCase()),
      emailVerified: true,
      emailVerifiedAddress: email,
      emailVerifiedAt: now,
      createdAt: workflow.createdAt,
      updatedAt: now,
      expiresAt: now + 30 * 86400000,
      source: "aio-chat",
    });
    const data = await responseData(
      await submitSellerApplication(
        internalRequest(request, "/api/seller/apply", {
          draftId,
          resumeId: resumeId.toUpperCase(),
          form: input,
          turnstileToken: (workflow as any).turnstileToken,
        }),
      ),
    );
    return {
      summary:
        "Your seller application was submitted for review. Account activation will be available through an invitation after approval.",
      reference: data.trackingId,
      href: "/seller/application/track",
    };
  }
  if (kind === "application_track") {
    const key = String(input.trackingId).toUpperCase(),
      index = (
        await adminDb
          .ref(`sellerApplicationTrackingIndex/${trackingHash(key)}`)
          .get()
      ).val(),
      applicationId = index?.applicationId || input.trackingId;
    if (!safeId(applicationId))
      throw new CustomerActionError(
        "No application matched these verified details.",
        404,
      );
    const a = (
        await adminDb.ref(`sellerApplications/${applicationId}`).get()
      ).val(),
      recorded = clean(
        input.emailType === "personal"
          ? a?.personalEmail
          : a?.businessEmail || a?.email,
        320,
      ).toLowerCase();
    if (!a || recorded !== email)
      throw new CustomerActionError(
        "No application matched these verified details.",
        404,
      );
    return {
      summary: "Your application status was loaded from Auronix records.",
      reference: clean(a.trackingId || applicationId),
      href: "/seller/application/track",
      records: [
        {
          title: clean(a.businessName, 200),
          fields: {
            Status: clean(a.status, 80),
            "Review message": clean(a.reviewMessage, 2000),
            "Last updated": new Date(
              Number(a.updatedAt || a.createdAt || now),
            ).toISOString(),
          },
        },
      ],
    };
  }
  if (kind === "support_create") {
    const ticketId = `aio-${id}`,
      ref = adminDb.ref(`tickets/${ticketId}`);
    await ref.transaction(
      (current) =>
        current || {
          name: input.name,
          email,
          subject: input.subject,
          category: input.category,
          message: input.message,
          status: "open",
          source: "aio-action",
          ...(identity ? { uid: identity.uid, sellerUid: identity.uid } : {}),
          createdAt: now,
          updatedAt: now,
        },
    );
    const delivery: any = await sendProfessionalEmail(
      {
        to: SUPPORT_EMAIL,
        subject: `Customer support request: ${input.subject}`,
        body: `Reference: ${ticketId}\nFrom: ${input.name}\nReply email: ${email}\nCategory: ${input.category}\n\n${input.message}`,
        replyTo: email,
        idempotencyKey: `aio-support-team-${id}`,
      },
      "notification",
    ).catch(() => null);
    void delivery;
    return {
      summary:
        "Your request was saved for the support team. Replies will be sent to your verified email.",
      reference: ticketId,
      href: "/support/contact",
    };
  }
  if (kind === "email_me") {
    const sent: any = await sendProfessionalEmail(
      {
        to: email,
        subject: input.subject,
        body: `Your requested AIO copy\n\nYou asked Auronix chat to email the following content to this verified address.\n\n${input.message}`,
        idempotencyKey: `aio-email-${id}`,
        fromName: "Auronix Commerce",
      },
      "notification",
    );
    return {
      summary: sent?.queued
        ? "Your requested email is queued. Delivery will retry automatically."
        : "Your requested email was accepted by the mail service.",
      emailStatus: sent?.queued ? "queued" : "sent",
    };
  }
  if (!identity)
    throw new CustomerActionError("Sign in to use this account action.", 401);
  if (identity.email !== email)
    throw new CustomerActionError(
      "Your account email changed. Start this action again.",
      409,
    );
  const uid = identity.uid;
  if (kind === "profile_update") {
    const ref = adminDb.ref(`users/${uid}`);
    const updated = await ref.transaction((profile) => {
      if (!profile) return profile;
      if (profile.lastAioCustomerActionId === id) return profile;
      if (
        workflow.context?.profileVersion !==
        digest(
          JSON.stringify([
            profile.displayName || "",
            profile.businessName || "",
            profile.phone || "",
            profile.website || "",
          ]),
        )
      )
        return;
      return {
        ...profile,
        displayName: input.displayName,
        name: input.displayName,
        businessName: input.businessName,
        phone: input.phone,
        website: input.website,
        lastAioCustomerActionId: id,
        updatedAt: now,
      };
    });
    if (!updated.committed || !updated.snapshot.exists())
      throw new CustomerActionError(
        "Your profile changed during review. Reopen this action to review the latest details.",
        409,
      );
    return { summary: "Your profile contact information has been updated." };
  }
  if (["support_reply", "support_close", "support_reopen"].includes(kind)) {
    if (!safeId(input.ticketId))
      throw new CustomerActionError("Invalid ticket reference.");
    const ref = adminDb.ref(`tickets/${input.ticketId}`),
      messageId = `aio-${id}`;
    const result = await ref.transaction((ticket) => {
      if (!ticket) return ticket;
      if (!ownsTicket(ticket, identity)) return;
      if (ticket.lastCustomerActionId === id) return ticket;
      if (ticket.status !== workflow.context?.ticketStatus) return;
      const status =
        kind === "support_close"
          ? "closed"
          : kind === "support_reopen"
            ? "open"
            : ticket.status === "closed"
              ? "open"
              : ticket.status;
      return {
        ...ticket,
        status,
        updatedAt: now,
        lastCustomerActionId: id,
        ...(kind === "support_reply"
          ? {
              lastCustomerReplyAt: now,
              messages: {
                ...(ticket.messages || {}),
                [messageId]: {
                  role: "customer",
                  content: input.message,
                  createdAt: now,
                },
              },
            }
          : {}),
      };
    });
    if (!result.committed || !ownsTicket(result.snapshot.val(), identity))
      throw new CustomerActionError(
        "This ticket is unavailable or changed during review. Reopen the action.",
        409,
      );
    // The offline worker processes the new customer turn independently after this request completes.
    return {
      summary:
        kind === "support_reply"
          ? "Your reply was added to your support ticket."
          : kind === "support_close"
            ? "Your support ticket is now closed."
            : "Your support ticket is open again.",
      reference: input.ticketId,
    };
  }
  if (kind === "product_draft" || kind === "catalog_add") {
    const key = kind === "product_draft" ? "products" : "catalogs",
      itemId = `aio-${id}`,
      ref = adminDb.ref(`sellerData/${uid}/${key}/${itemId}`);
    await ref.transaction(
      (current) =>
        current || {
          ...input,
          ...(kind === "product_draft" ? { status: "draft" } : {}),
          createdAt: now,
          updatedAt: now,
          source: "aio-chat",
        },
    );
    return {
      summary:
        kind === "product_draft"
          ? "Your product was saved as a draft in your seller workspace."
          : "Your catalog link was added to your seller workspace.",
      reference: itemId,
      href:
        kind === "product_draft"
          ? "/seller/dashboard/products"
          : "/seller/dashboard/catalogs",
    };
  }
  throw new CustomerActionError("Choose a supported customer action.");
}
export async function emailActionReceipt(
  workflow: CustomerWorkflow,
  result: CustomerActionResult,
) {
  if (
    [
      "email_me",
      "supplier_apply",
      "seller_apply",
      "application_track",
    ].includes(workflow.kind)
  )
    return result;
  try {
    const mail: any = await sendProfessionalEmail(
      {
        to: workflow.email,
        subject: "Your Auronix chat action receipt",
        body: `${result.summary}${result.reference ? `\nReference: ${result.reference}` : ""}\n\nThis is a receipt for the action you confirmed in Auronix chat.`,
        idempotencyKey: `aio-receipt-${workflow.id}`,
      },
      "notification",
    );
    return {
      ...result,
      emailStatus: mail?.queued ? ("queued" as const) : ("sent" as const),
    };
  } catch {
    return { ...result, emailStatus: "failed" as const };
  }
}
