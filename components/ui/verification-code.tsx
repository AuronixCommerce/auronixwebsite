"use client";

import { useId } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";
import { normalizeVerificationCode } from "@/lib/aio/verification-code";

/** One real input keeps SMS/email autofill, paste and keyboard navigation native. */
export function VerificationCode({ value, onChange, disabled = false, autoFocus = false,
  label = "Verification code", hint = "Paste your six-digit code, or enter it below.",
  invalid = false, required = true, id,
}: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
  autoFocus?: boolean; label?: string; hint?: string; invalid?: boolean;
  required?: boolean; id?: string;
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <div className={`ac-code-entry${invalid ? " is-invalid" : ""}`}>
    <div className="ac-code-entry-label">
      <label htmlFor={inputId}>{label}</label>
      <span aria-hidden="true">{value.length} / 6</span>
    </div>
    <InputOTP id={inputId} value={value} onChange={v => onChange(normalizeVerificationCode(v))}
      maxLength={6} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9٠-٩۰-۹]*"
      pasteTransformer={normalizeVerificationCode} disabled={disabled} autoFocus={autoFocus}
      required={required} aria-invalid={invalid || undefined}
      aria-describedby={hint ? `${inputId}-hint` : undefined}
      containerClassName="ac-code-entry-input">
      <InputOTPGroup className="ac-code-entry-slots">
        {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index}
          className={`ac-code-entry-slot${value[index] ? " is-filled" : ""}`} />)}
      </InputOTPGroup>
    </InputOTP>
    {hint && <p id={`${inputId}-hint`} className="ac-code-entry-hint">{hint}</p>}
  </div>;
}
