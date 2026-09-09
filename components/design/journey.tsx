"use client";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ProgressIndicator } from "./primitives";
type Step = { number: string; title: string; description: string };
export function Timeline({
  steps,
  label = "Business process",
}: {
  steps: readonly Step[];
  label?: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div className="ac-journey" aria-label={label}>
      <div className="ac-journey-index">
        <span className="ac-eyebrow">{label}</span>
        <ol>
          {steps.map((step, i) => (
            <li key={step.number}>
              <button
                type="button"
                aria-current={active === i ? "step" : undefined}
                aria-controls={`journey-${label.replace(/\s/g, "-")}-${i}`}
                onClick={() => setActive(i)}
              >
                <span>{step.number}</span>
                {step.title}
                <ArrowRight size={16} />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="ac-journey-story">
        <span className="ac-journey-number" aria-hidden="true">
          {steps[active].number}
        </span>
        <div aria-live="polite">
          {steps.map((step, i) => (
            <article
              id={`journey-${label.replace(/\s/g, "-")}-${i}`}
              key={step.number}
              hidden={active !== i}
            >
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
        <div className="ac-journey-controls">
          <ProgressIndicator
            value={((active + 1) / steps.length) * 100}
            label={`Stage ${active + 1} of ${steps.length}`}
          />
          <button
            type="button"
            className="ac-icon-button"
            aria-label="Previous stage"
            disabled={active === 0}
            onClick={() => setActive((a) => a - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="ac-icon-button"
            aria-label="Next stage"
            disabled={active === steps.length - 1}
            onClick={() => setActive((a) => a + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current?: number;
}) {
  return (
    <ol className="ac-stepper" aria-label="Supplier journey">
      {steps.map((s, i) => (
        <li key={s} aria-current={current === i ? "step" : undefined}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}
export function SupplierJourney({ current }: { current?: number }) {
  return (
    <Stepper
      steps={["Discover", "Apply", "Review", "Verification", "Partnership"]}
      current={current}
    />
  );
}
