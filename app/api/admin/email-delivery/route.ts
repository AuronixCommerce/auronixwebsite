import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import {
  verifyMailConnection,
  mailConfigurationStatus,
  mailFailureMessage,
  processEmailQueue,
} from "@/lib/server-mail";
import { writeAuditLog } from "@/lib/server-audit";
import { publicMailJob } from "@/lib/mail-queue";
import { userFacingError } from "@/lib/user-facing-error";

export const dynamic = "force-dynamic";
const list = (snapshot: any) =>
  snapshot.exists()
    ? Object.entries(snapshot.val() as Record<string, any>).map(
        ([id, item]) => ({ ...item, id }),
      )
    : [];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [deliverySnapshot, eventSnapshot] = await Promise.all([
      adminDb.ref("emailDeliveryLogs").get(),
      adminDb.ref("newsletterDeliveryEvents").get(),
    ]);
    const deliveries = list(deliverySnapshot)
      .sort(
        (a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
      )
      .slice(0, 500);
    const events = list(eventSnapshot)
      .sort(
        (a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
      )
      .slice(0, 300);

    const [queueSnap, alertsSnap, workerSnap] = await Promise.all([
      adminDb.ref("emailQueue").get(),
      adminDb.ref("emailAlerts").get(),
      adminDb.ref("workerHealth").get(),
    ]);
    const queue = Object.entries(queueSnap.val() || {})
      .map(([id, job]) => publicMailJob(id, job))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500);
    const jobs = queueSnap.val() || {};
    for (const delivery of deliveries) {
      const jobId = String(
        delivery.queueId ||
          (String(delivery.providerMessageId || "").startsWith("queue:")
            ? String(delivery.providerMessageId).slice(6)
            : ""),
      );
      if (jobs[jobId]) {
        delivery.status = jobs[jobId].status;
        delivery.updatedAt = jobs[jobId].updatedAt;
        delivery.providerMessageId =
          jobs[jobId].providerMessageId || delivery.providerMessageId;
      }
    }
    const stats = deliveries.reduce<Record<string, number>>(
      (value, item: any) => ({
        ...value,
        [item.status || "unknown"]: (value[item.status || "unknown"] || 0) + 1,
      }),
      {},
    );
    const alerts = list(alertsSnap)
      .filter((a: any) => !a.resolved)
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .slice(0, 100);
    return NextResponse.json(
      {
        success: true,
        deliveries,
        events,
        stats,
        queue,
        alerts,
        worker: workerSnap.val() || {},
        schedulerConfigured: !!process.env.CRON_SECRET,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: userFacingError(error, "Unable to load email delivery.") },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    if (body.action === "acknowledge-alert") {
      if (!/^[\w-]{1,160}$/.test(body.id || ""))
        return NextResponse.json({ error: "Invalid alert." }, { status: 400 });
      await adminDb
        .ref(`emailAlerts/${body.id}`)
        .update({
          resolved: true,
          resolvedAt: Date.now(),
          resolvedBy: admin.uid,
        });
      return NextResponse.json({ success: true });
    }
    if (body.action === "retry-queue") {
      if (body.id) {
        if (!/^[\w-]{1,160}$/.test(body.id))
          return NextResponse.json(
            { error: "Invalid email job." },
            { status: 400 },
          );
        const ref = adminDb.ref(`emailQueue/${body.id}`);
        const result = await ref.transaction((job) =>
          job &&
          job.payload &&
          job.expiresAt > Date.now() &&
          job.status === "queued" &&
          job.leaseUntil < Date.now()
            ? { ...job, nextAttemptAt: Date.now(), updatedAt: Date.now() }
            : undefined,
        );
        if (!result.committed)
          return NextResponse.json(
            {
              error:
                "This message cannot be retried. Request a new email if its code or link has expired.",
            },
            { status: 409 },
          );
      }
      return NextResponse.json({
        success: true,
        ...(await processEmailQueue()),
      });
    }
    if (body.action !== "test-connection")
      return NextResponse.json(
        { error: "Unsupported email action." },
        { status: 400 },
      );
    try {
      await verifyMailConnection();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: mailFailureMessage(error),
          configuration: mailConfigurationStatus(),
        },
        { status: 503 },
      );
    }
    await writeAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: "EMAIL_CONNECTION_TEST",
      targetType: "emailService",
      summary: "Transactional email connection verified.",
      request,
    });
    return NextResponse.json({ success: true, checkedAt: Date.now() });
  } catch (error) {
    return NextResponse.json(
      { error: userFacingError(error, "Email service check failed.") },
      { status: 503 },
    );
  }
}
