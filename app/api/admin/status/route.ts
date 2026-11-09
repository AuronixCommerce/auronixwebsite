import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { writeAuditLog } from "@/lib/server-audit";
import {
  SERVICE_NAMES,
  SERVICE_STATES,
  INCIDENT_STATES,
} from "@/lib/service-status";
const services = z.enum(["website", "aio", "email", "portal"]);
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("service"),
    serviceId: services,
    status: z.enum(SERVICE_STATES),
  }),
  z.object({
    action: z.literal("incident"),
    title: z.string().trim().min(3).max(180),
    body: z.string().trim().min(5).max(4000),
    status: z.enum(INCIDENT_STATES),
    serviceIds: z.array(services).min(1).max(4),
    startAt: z.number().nonnegative().optional(),
    endAt: z.number().nonnegative().optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().regex(/^[\w-]{1,160}$/),
    body: z.string().trim().min(3).max(2000),
    status: z.enum(INCIDENT_STATES),
  }),
]);
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Review the status update fields." },
      { status: 400 },
    );
  const body = parsed.data,
    now = Date.now();
  if (body.action === "service")
    await adminDb
      .ref(`serviceStatus/services/${body.serviceId}`)
      .set({ status: body.status, updatedAt: now, updatedBy: admin.uid });
  if (body.action === "incident") {
    if (body.endAt && body.startAt && body.endAt <= body.startAt)
      return NextResponse.json(
        { error: "Maintenance must end after it starts." },
        { status: 400 },
      );
    const ref = adminDb.ref("serviceStatus/incidents").push();
    await ref.set({
      ...body,
      action: null,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.uid,
    });
  }
  if (body.action === "update") {
    const ref = adminDb.ref(`serviceStatus/incidents/${body.id}`);
    if (!(await ref.get()).exists())
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 },
      );
    const update = ref.child("updates").push();
    await ref.update({
      status: body.status,
      updatedAt: now,
      [`updates/${update.key}`]: {
        body: body.body,
        status: body.status,
        createdAt: now,
      },
    });
  }
  await writeAuditLog({
    actorUid: admin.uid,
    action: "PUBLIC_STATUS_UPDATE",
    targetType: "serviceStatus",
    summary: `Published ${body.action} update.`,
    request,
  });
  return NextResponse.json({ success: true });
}
