import { safeConversation,issueSummary } from '@/lib/partner/model';
import { randomInt, randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import {
  CUSTOMER_ACTIONS,
  isCustomerActionKind,
  type CustomerActionKind,
} from "@/lib/aio/customer-actions";
import {
  allowCustomerAction,
  requireCustomer,
  customerIdentity,
  CustomerActionError,
  digest,
  otpHash,
  equalHash,
  maskedEmail,
  ownsTicket,
  type CustomerIdentity,
} from "@/lib/aio/customer-security";
import { validateCustomerInput } from "@/lib/aio/customer-input";
import {
  executeCustomerAction,
  emailActionReceipt,
} from "@/lib/aio/customer-execute";
import { inspectCustomerAction } from "@/lib/aio/customer-read";
import { sendProfessionalEmail, retryQueuedEmail } from "@/lib/server-mail";
import { normalizeVerificationCode } from "@/lib/aio/verification-code";
import { writeAuditLog } from "@/lib/server-audit";
import {
  normalizeConversationId,
  saveAuthenticatedAioTurn,
} from "@/lib/aio/history";
const TTL = 30 * 60_000,
  OTP_TTL = 10 * 60_000;
function view(flow: any) {
  return {
    id: flow.id,
    kind: flow.kind,
    phase: flow.phase,
    title: CUSTOMER_ACTIONS[flow.kind as CustomerActionKind].title,
    emailMasked: maskedEmail(flow.email),
    expiresAt: flow.expiresAt,
    otpExpiresAt: flow.otpExpiresAt,
    resendAt: flow.sentAt + 60_000,
    emailStatus: flow.emailStatus || "pending",
    ...(flow.phase === "review" ? { review: flow.input } : {}),
    ...(flow.phase === "complete" ? { result: flow.result } : {}),
  };
}
async function limitEmail(email: string) {
  const ref = adminDb.ref(`aioActionEmailRates/${digest(email)}`),
    now = Date.now();
  const result = await ref.transaction((v) =>
    !v || v.expiresAt <= now
      ? { count: 1, expiresAt: now + 30 * 60_000 }
      : v.count >= 5
        ? undefined
        : { ...v, count: v.count + 1 },
  );
  if (!result.committed)
    throw new CustomerActionError(
      "Too many verification emails were requested. Please try again later.",
      429,
    );
}
async function sendCode(
  ref: ReturnType<typeof adminDb.ref>,
  flow: any,
  code: string,
) {
  let emailStatus = "failed",
    queueId = "";
  try {
    const mail: any = await sendProfessionalEmail(
      {
        to: flow.email,
        subject: "Verify your Auronix chat action",
        body: `Your Auronix verification code is ${code}.\n\nAction: ${CUSTOMER_ACTIONS[flow.kind as CustomerActionKind].title}\nThis code expires in 10 minutes. Enter it only in the verification box inside Auronix chat. Do not send it as a chat message or share it with support.\n\nIf you did not request this action, ignore this email.`,
        expiresAt: flow.otpExpiresAt,
        idempotencyKey: `aio-action-otp-${flow.id}-${flow.sendCount}`,
      },
      "notification",
    );
    emailStatus = mail?.queued ? "queued" : "sent";
    queueId = mail?.queueId || "";
  } catch {}
  await ref.update({ emailStatus, otpQueueId: queueId, sentAt: Date.now() });
  return { ...flow, emailStatus, sentAt: Date.now() };
}
async function loadFlow(body: any, identity: CustomerIdentity | null) {
  const id = String(body.id || ""),
    token = String(body.token || "");
  if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-f0-9]{64}$/.test(token))
    throw new CustomerActionError(
      "Start this action again. Its verification session is invalid.",
      401,
    );
  const ref = adminDb.ref(`aioCustomerWorkflows/${id}`),
    flow = (await ref.get()).val();
  if (
    !flow ||
    !equalHash(flow.tokenHash, digest(token)) ||
    String(flow.uid || "") !== String(identity?.uid || "")
  )
    throw new CustomerActionError(
      "This action does not belong to the current session.",
      403,
    );
  if (flow.expiresAt <= Date.now())
    throw new CustomerActionError(
      "This action expired. Start again to verify a fresh request.",
      410,
    );
  await allowCustomerAction(flow.kind);
  requireCustomer(identity, flow.kind);
  return { ref, flow };
}
export async function customerWorkflowRequest(
  request: Request,
  body: any,
  files?: FormData,
) {
  const identity = await customerIdentity(request),
    mode = String(body.mode || "");
  if (mode === "inspect") {
    if (!isCustomerActionKind(body.kind))
      throw new CustomerActionError("Choose a supported account lookup.");
    const kind: CustomerActionKind = body.kind;
    if (CUSTOMER_ACTIONS[kind].mode !== (mode === "inspect" ? "read" : "write"))
      throw new CustomerActionError("Choose a supported customer action.");
    await allowCustomerAction(kind);
    requireCustomer(identity, kind);
    const result = await inspectCustomerAction(kind, identity!);
    const conversationId = normalizeConversationId(body.conversationId);
    if (conversationId && body.saveHistory === true)
      await saveAuthenticatedAioTurn({
        uid: identity!.uid,
        conversationId,
        requestId: randomUUID(),
        userContent: CUSTOMER_ACTIONS[kind].title,
        assistantContent: result.summary,
        sourceIds: [],
        model: "customer-account-lookup",
      }).catch(() => undefined);
    await writeAuditLog({
      actorUid: identity!.uid,
      action: "AIO_CUSTOMER_LOOKUP",
      targetType: kind,
      summary: "Customer requested their own account information.",
    });
    return { success: true, result };
  }
  if (mode === "prepare") {
    if (!isCustomerActionKind(body.kind))
      throw new CustomerActionError("Choose a supported customer action.");
    const kind: CustomerActionKind = body.kind;
    if (CUSTOMER_ACTIONS[kind].mode !== "write")
      throw new CustomerActionError("Choose a supported customer action.");
    await allowCustomerAction(kind);
    requireCustomer(identity, kind);
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(String(body.requestKey || "")))
      throw new CustomerActionError("Start this action again.");
    const handoffMessages=kind==='support_create'&&body.handoff?.consent===true?safeConversation(body.handoff.messages):[];
    const { input, email } = validateCustomerInput(kind, body.input, identity),
      id = digest(body.requestKey).slice(0, 32),
      token = otpHash(id, "workflow-token", body.requestKey),
      ref = adminDb.ref(`aioCustomerWorkflows/${id}`),
      fingerprint = digest(JSON.stringify({ kind, input, email, ...(handoffMessages.length?{handoffMessages}:{}) }));
    const previous = (await ref.get()).val();
    if (previous) {
      if (
        String(previous.uid || "") !== String(identity?.uid || "") ||
        previous.fingerprint !== fingerprint ||
        previous.expiresAt <= Date.now()
      )
        throw new CustomerActionError(
          "Your request changed or expired. Start a fresh action.",
          409,
        );
      return { success: true, token, ...view(previous) };
    }
    const context: Record<string, any> = {};
    if(handoffMessages.length) context.handoff={messages:handoffMessages,summary:issueSummary(handoffMessages,input.message),consentedAt:Date.now()};
    if (kind === "profile_update") {
      const p = identity!.profile;
      context.profileVersion = digest(
        JSON.stringify([
          p.displayName || "",
          p.businessName || "",
          p.phone || "",
          p.website || "",
        ]),
      );
    }
    if (kind === "seller_apply")
      context.sellerResumeId = otpHash(id, "seller-resume", body.requestKey);
    if (["support_reply", "support_close", "support_reopen"].includes(kind)) {
      const ticket = (
        await adminDb.ref(`tickets/${input.ticketId}`).get()
      ).val();
      if (!ownsTicket(ticket, identity!))
        throw new CustomerActionError(
          "Ticket not found for your account.",
          404,
        );
      context.ticketStatus = ticket.status;
    }
    await limitEmail(email);
    const now = Date.now(),
      code = String(randomInt(100000, 1000000));
    const flow = {
      creationId: randomUUID(),
      id,
      kind,
      uid: identity?.uid || "",
      email,
      input,
      context,
      fingerprint,
      tokenHash: digest(token),
      phase: "verify",
      otpHash: otpHash(id, email, code),
      attempts: 0,
      sendCount: 1,
      sentAt: now,
      otpExpiresAt: now + OTP_TTL,
      createdAt: now,
      expiresAt: now + TTL,
      conversationId: normalizeConversationId(body.conversationId) || "",
      saveHistory: body.saveHistory === true,
    };
    const created = await ref.transaction((v) => v || flow);
    if (created.snapshot.val()?.fingerprint !== fingerprint)
      throw new CustomerActionError(
        "A different request is already being verified.",
        409,
      );
    if (created.snapshot.val()?.creationId !== flow.creationId)
      return { success: true, token, ...view(created.snapshot.val()) };
    const sent = await sendCode(ref, flow, code);
    return { success: true, token, ...view(sent) };
  }
  const { ref, flow } = await loadFlow(body, identity);
  if (mode === "delivery-status") {
    if (flow.phase !== "verify" || !flow.otpQueueId)
      return { success: true, ...view(flow) };
    const jobRef = adminDb.ref(`emailQueue/${flow.otpQueueId}`);
    let job = (await jobRef.get()).val();
    if (!job || String(job.recipient || "").toLowerCase() !== flow.email)
      throw new CustomerActionError(
        "This email job does not belong to your verification session.",
        403,
      );
    if (
      ["queued", "processing"].includes(job.status) &&
      Number(job.nextAttemptAt) <= Date.now() &&
      Number(job.leaseUntil || 0) <= Date.now()
    ) {
      await retryQueuedEmail(flow.otpQueueId).catch(() => undefined);
      job = (await jobRef.get()).val();
    }
    const emailStatus = ["sent", "delivered", "opened", "clicked"].includes(
      job?.status,
    )
      ? "sent"
      : ["queued", "processing"].includes(job?.status)
        ? "queued"
        : "failed";
    const changed = await ref.transaction((current) => {
      if (!current) return current;
      if (current.phase !== "verify" || current.otpQueueId !== flow.otpQueueId)
        return;
      return { ...current, emailStatus };
    });
    return { success: true, ...view(changed.snapshot.val() || flow) };
  }
  if (mode === "resend") {
    if (flow.phase !== "verify")
      throw new CustomerActionError("Verification is already complete.");
    if (flow.sendCount >= 3 || Date.now() - flow.sentAt < 60_000)
      throw new CustomerActionError(
        "Wait before requesting another code. Each action allows three emails.",
        429,
      );
    await limitEmail(flow.email);
    const code = String(randomInt(100000, 1000000)),
      now = Date.now();
    const changed = await ref.transaction((v) =>
      v && v.phase === "verify" && v.sendCount < 3 && now - v.sentAt >= 60_000
        ? {
            ...v,
            sendCount: v.sendCount + 1,
            sentAt: now,
            attempts: 0,
            otpHash: otpHash(v.id, v.email, code),
            otpExpiresAt: now + OTP_TTL,
          }
        : undefined,
    );
    if (!changed.committed)
      throw new CustomerActionError(
        "A verification email was already requested. Please wait.",
        409,
      );
    if (flow.otpQueueId)
      await adminDb
        .ref(`emailQueue/${flow.otpQueueId}`)
        .transaction((j) =>
          !j
            ? j
            : j.status === "queued"
              ? { ...j, status: "expired", payload: null, leaseUntil: 0 }
              : undefined,
        );
    return {
      success: true,
      ...view(await sendCode(ref, changed.snapshot.val(), code)),
    };
  }
  if (mode === "verify") {
    const code = normalizeVerificationCode(String(body.code || ""));
    if (!/^\d{6}$/.test(code))
      throw new CustomerActionError(
        "Enter the six-digit code from your email.",
      );
    const checked = await ref.transaction((v) => {
      if (!v) return v;
      if (
        v.phase !== "verify" ||
        v.attempts >= 5 ||
        v.otpExpiresAt <= Date.now()
      )
        return;
      const valid = equalHash(v.otpHash, otpHash(v.id, v.email, code));
      return {
        ...v,
        attempts: v.attempts + 1,
        ...(valid
          ? { phase: "review", verifiedAt: Date.now(), otpHash: null }
          : {}),
      };
    });
    const current = checked.snapshot.val();
    if (!checked.committed || current?.phase !== "review")
      throw new CustomerActionError(
        "The code is incorrect or expired. After five attempts, request a new code.",
      );
    return { success: true, ...view(current) };
  }
  if (mode === "cancel") {
    if (flow.phase === "complete")
      throw new CustomerActionError(
        "This action is already complete and cannot be cancelled.",
        409,
      );
    if (flow.phase === "executing")
      throw new CustomerActionError(
        "This action is already processing. Check its result before starting another.",
        409,
      );
    if (flow.otpQueueId)
      await adminDb
        .ref(`emailQueue/${flow.otpQueueId}`)
        .transaction((j) =>
          !j
            ? j
            : j.status === "queued"
              ? { ...j, status: "expired", payload: null, leaseUntil: 0 }
              : undefined,
        );
    await ref.update({
      phase: "cancelled",
      otpHash: null,
      input: null,
      expiresAt: Date.now(),
    });
    return { success: true, cancelled: true };
  }
  if (mode !== "confirm" || body.confirmed !== true)
    throw new CustomerActionError(
      "Review and confirm the action before it can run.",
    );
  if (flow.phase === "complete") return { success: true, ...view(flow) };
  const owner = randomUUID(),
    now = Date.now();
  const claim = await ref.transaction((v) => {
    if (!v) return v;
    if (
      !v.verifiedAt ||
      now - v.verifiedAt > OTP_TTL ||
      (v.phase !== "review" && !(v.phase === "executing" && v.leaseUntil < now))
    )
      return;
    return { ...v, phase: "executing", owner, leaseUntil: now + 90_000 };
  });
  const job = claim.snapshot.val();
  if (!claim.committed || job?.owner !== owner)
    throw new CustomerActionError(
      "This action is already processing or its verification expired.",
      409,
    );
  try {
    const result = await executeCustomerAction(
      { ...job, turnstileToken: body.turnstileToken },
      identity,
      request,
      files,
    );
    const receipt = await emailActionReceipt(job, result);
    await ref.transaction((v) =>
      v?.owner === owner
        ? {
            ...v,
            phase: "complete",
            result: receipt,
            completedAt: Date.now(),
            leaseUntil: 0,
            otpHash: null,
            input: null,
            context: null,
          }
        : undefined,
    );
    await writeAuditLog({
      actorUid: identity?.uid || "email-verified-customer",
      actorEmail: job.email,
      action: "AIO_CUSTOMER_ACTION",
      targetType: job.kind,
      targetId: job.id,
      summary: "Customer confirmed an email-verified action.",
    }).catch(() => undefined);
    if (identity && job.conversationId && job.saveHistory)
      await saveAuthenticatedAioTurn({
        uid: identity.uid,
        conversationId: job.conversationId,
        requestId: `action-${job.id}`,
        userContent: CUSTOMER_ACTIONS[job.kind as CustomerActionKind].title,
        assistantContent:
          receipt.summary +
          (receipt.reference ? `\nReference: ${receipt.reference}` : ""),
        sourceIds: [],
        model: "verified-customer-action",
      }).catch(() => undefined);
    return {
      success: true,
      ...view({ ...job, phase: "complete", result: receipt }),
    };
  } catch (error) {
    await ref.transaction((v) =>
      v?.owner === owner ? { ...v, phase: "review", leaseUntil: 0 } : undefined,
    );
    throw error;
  }
}
