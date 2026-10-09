"use client";

import { useState } from "react";
import { ArrowUpRight, Check, MoveUpRight } from "lucide-react";
import { PROCESS_STEPS } from "@/lib/constants";

/** A small, interactive view of the existing commerce process. No network or timer. */
export function CommerceStage() {
  const [active, setActive] = useState(0);
  const step = PROCESS_STEPS[active];

  return (
    <div className="nx-stage" aria-label="Explore the Auronix process">
      <div className="nx-stage-top">
        <span><i /> AURONIX / OPERATIONS</span>
        <span>LIVE PROCESS VIEW <MoveUpRight size={14} /></span>
      </div>
      <div className="nx-stage-visual" aria-hidden="true">
        <span className="nx-stage-orbit nx-stage-orbit-a" />
        <span className="nx-stage-orbit nx-stage-orbit-b" />
        <span className="nx-stage-axis nx-stage-axis-h" />
        <span className="nx-stage-axis nx-stage-axis-v" />
        <span className="nx-stage-core"><span>AX</span><small>COMMERCE</small></span>
        <span className="nx-stage-node nx-stage-node-a">01 / SOURCE</span>
        <span className="nx-stage-node nx-stage-node-b">02 / OPERATE</span>
        <span className="nx-stage-node nx-stage-node-c">03 / DISTRIBUTE</span>
      </div>
      <div className="nx-stage-detail" aria-live="polite">
        <div><span className="nx-stage-count">{String(active + 1).padStart(2, "0")} / 05</span><h2>{step.title}<span>.</span></h2></div>
        <p>{step.description}</p>
      </div>
      <div className="nx-stage-steps" role="group" aria-label="Process stages">
        {PROCESS_STEPS.map((item, index) => (
          <button key={item.title} type="button" onClick={() => setActive(index)} aria-pressed={active === index} aria-label={`View ${item.title} stage`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i />
            {active === index ? <Check size={15} /> : <ArrowUpRight size={15} />}
          </button>
        ))}
      </div>
    </div>
  );
}
