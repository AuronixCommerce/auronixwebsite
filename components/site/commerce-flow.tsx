import { AuronixMark } from "./auronix-mark";
export function CommerceFlow() {
  return (
    <div className="ac-flow ac-glass">
      <div className="ac-flow-title">
        <span>COMMERCE FLOW</span>
        <span className="ac-flow-state"><i /> MODEL 01 — 05</span>
      </div>
      <ol className="ac-flow-map">
        {[
          "Suppliers",
          "Auronix",
          "Procurement",
          "Marketplaces",
          "Customers",
        ].map((label, i) => (
          <li key={label} data-focus={i === 1 || undefined}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {i === 1 && <AuronixMark />}
            <strong>{label}</strong>
            {i < 4 && <i className="ac-flow-connector" aria-hidden="true" />}
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
        Illustrative model; live operational status appears only inside authenticated workspaces
      </p>
    </div>
  );
}
