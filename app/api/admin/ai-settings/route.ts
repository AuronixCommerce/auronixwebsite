import { userFacingError } from "@/lib/user-facing-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { DEFAULT_AIO_SETTINGS } from "@/lib/aio/settings";
const model = z
  .string()
  .trim()
  .max(160)
  .regex(/^[a-zA-Z0-9._:/-]*$/);
const settingsSchema = z
  .object({
    enabled: z.boolean(),
    publicChatEnabled: z.boolean(),
    autoReplyWhenOffline: z.boolean(),
    continueTicketConversations: z.boolean(),
    knowledgeEnabled: z.boolean(),
    moderationEnabled: z.boolean(),
    customInstructions: z.string().max(12000),
    aioReplyLength: z.enum(["adaptive", "brief", "detailed"]),
    aioTone: z.enum(["professional", "friendly", "direct"]),
    aioMaxResponseTokens: z.number().int().min(200).max(3000),
    aioRetrievalLimit: z.number().int().min(1).max(6),
    aioTemperature: z.number().min(0).max(1),
    aioModel: model,
    aioFastModel: model,
    aioOneModel: model,
    aioFallbackModel: model,
  })
  .partial();
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.ref("settings/ai").get();
    return NextResponse.json({
      ...DEFAULT_AIO_SETTINGS,
      ...(snapshot.exists() ? snapshot.val() : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: userFacingError(error, "Unable to load AI settings.") },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const result = settingsSchema.safeParse(await request.json());
    if (!result.success || !Object.keys(result.data).length)
      return NextResponse.json(
        { error: "Please check the AI settings values." },
        { status: 400 },
      );
    const patch = {
      ...result.data,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    };
    await adminDb.ref("settings/ai").update(patch);
    return NextResponse.json({ success: true, ...patch });
  } catch (error) {
    return NextResponse.json(
      { error: userFacingError(error, "Unable to save AI settings.") },
      { status: 500 },
    );
  }
}
