import { CommerceScene } from '@/components/design/commerce-scene';
import { AuronixMark } from "./auronix-mark";
export function CommerceFlow() {
  return (
    <div className="ac-flow ac-glass">
      <div className="ac-flow-title">
        <span>COMMERCE FLOW</span>
        <span>01 — 05</span>
      </div>
      <CommerceScene/>
      <ol>
        {[
          "Suppliers",
          "Auronix",
          "Procurement",
          "Marketplaces",
          "Customers",
        ].map((label, i) => (
          <li key={label}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {i === 1 && <AuronixMark />}
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <dl>
        {[
          { label: "Pipeline", value: "Active" },
          { label: "Status", value: "Operational" },
          { label: "Network", value: "Connected" },
        ].map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="ac-flow-caption">
        Commerce model illustration · not a live operational feed
      </p>
    </div>
  );
}
