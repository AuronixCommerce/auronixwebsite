import { z } from "zod";
import {
  customerActionSteps,
  type CustomerActionKind,
} from "@/lib/aio/customer-actions";
import {
  CustomerActionError,
  type CustomerIdentity,
} from "@/lib/aio/customer-security";
import { normalizePhone } from "@/lib/seller-phone";
export function validateCustomerInput(
  kind: CustomerActionKind,
  input: unknown,
  identity: CustomerIdentity | null,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const step of customerActionSteps(kind))
    for (const f of step.fields) {
      if (f.type === "checkbox") {
        shape[f.key] = f.required
          ? z.literal(true)
          : z.boolean().optional().default(false);
        continue;
      }
      let value: z.ZodTypeAny = z
        .string()
        .trim()
        .max(f.maxLength || (f.type === "textarea" ? 5000 : 500));
      if (f.type === "email")
        value = z
          .string()
          .trim()
          .email()
          .max(320)
          .transform((s) => s.toLowerCase());
      else if (f.type === "url")
        value = z
          .string()
          .trim()
          .max(500)
          .refine(
            (v) => !v || /^https?:\/\/[^\s]+$/i.test(v),
            "Use an HTTP or HTTPS URL.",
          );
      else if (f.type === "select")
        value = z.enum(f.options as [string, ...string[]]);
      if (f.required && f.type !== "email" && f.type !== "select")
        value = value.refine(
          (v) => String(v).length >= (f.minLength || 1),
          `Complete ${f.label}.`,
        );
      if (!f.required)
        value = z
          .union([value, z.literal("")])
          .optional()
          .default("");
      shape[f.key] = value;
    }
  const parsed = z.object(shape).strict().safeParse(input);
  if (!parsed.success)
    throw new CustomerActionError(
      parsed.error.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .slice(0, 2)
        .join(" "),
    );
  const data = parsed.data as Record<string, any>;
  if (["supplier_apply", "seller_apply"].includes(kind)) {
    try {
      normalizePhone(data.phone);
    } catch {
      throw new CustomerActionError(
        "Enter a valid phone number with country code.",
      );
    }
  }
  if (data.ticketId && !/^[\w-]{1,160}$/.test(data.ticketId))
    throw new CustomerActionError("Enter a valid ticket reference.");
  if (data.trackingId && !/^[\w-]{8,128}$/.test(data.trackingId))
    throw new CustomerActionError("Enter a valid tracking ID.");
  if (
    kind === "seller_apply" &&
    data.yearsInBusiness &&
    (!Number.isFinite(Number(data.yearsInBusiness)) ||
      Number(data.yearsInBusiness) < 0 ||
      Number(data.yearsInBusiness) > 200)
  )
    throw new CustomerActionError(
      "Years in business must be between 0 and 200.",
    );
  const email =
    kind === "seller_apply"
      ? data[
          data.preferredContact === "personal"
            ? "personalEmail"
            : "businessEmail"
        ]
      : data.email || identity?.email;
  if (!email || !z.string().email().safeParse(email).success)
    throw new CustomerActionError(
      "A valid email address is required for this action.",
    );
  return { input: data, email: String(email).toLowerCase() };
}
