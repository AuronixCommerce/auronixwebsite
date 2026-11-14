"use client";
import { useState } from "react";
import { DEVELOPER_MODELS } from "@/lib/developers/model";
export function permissionsFromForm(f: FormData) {
  return {
    models: f.getAll("keyModel").map(String),
    allowedIps: String(f.get("allowedIps") || "")
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean),
    expiresAt: f.get("keyExpiry")
      ? new Date(String(f.get("keyExpiry"))).getTime()
      : null,
  };
}
function localTime(t: number) {
  const d = new Date(t);
  return new Date(t - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function KeyPermissionFields({
  value,
  disabled = false,
}: {
  value?: any;
  disabled?: boolean;
}) {
  return (
    <fieldset className="dev-permissions" disabled={disabled}>
      <legend>Key permissions</legend>
      <div className="dev-key-models">
        {DEVELOPER_MODELS.map((m) => (
          <label className="dev-checkbox" key={m.id}>
            <input
              type="checkbox"
              name="keyModel"
              value={m.id}
              defaultChecked={!value?.models || value.models.includes(m.id)}
            />
            <span>{m.name}</span>
          </label>
        ))}
      </div>
      <div className="dev-form-grid">
        <label>
          Allowed IPs or CIDR ranges{" "}
          <span className="dev-muted">(optional)</span>
          <textarea
            name="allowedIps"
            rows={2}
            defaultValue={value?.allowedIps?.join("\n") || ""}
            placeholder="One server outbound IP or CIDR per line"
          />
          <small>
            Blank allows any IP. Use your application server’s outbound IP.
          </small>
        </label>
        <label>
          Expires at{" "}
          <span className="dev-muted">(optional, your local time)</span>
          <input
            name="keyExpiry"
            type="datetime-local"
            defaultValue={value?.expiresAt ? localTime(value.expiresAt) : ""}
          />
          <small>
            Blank means no scheduled expiry. Revocation is immediate for new
            requests.
          </small>
        </label>
      </div>
    </fieldset>
  );
}
export function KeyPermissionEditor({
  keys,
  busy,
  onSave,
}: {
  keys: any[];
  busy: boolean;
  onSave: (id: string, permissions: any) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const key = keys.find((k) => k.id === selected);
  return (
    <div className="dev-section">
      <h3>Change a key’s permissions</h3>
      <label className="dev-select-label">
        Active key
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose a key</option>
          {keys
            .filter((k) => k.status === "active")
            .map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} · {k.prefix}
              </option>
            ))}
        </select>
      </label>
      {key && (
        <form
          className="dev-form"
          key={key.id + JSON.stringify(key.permissions)}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void onSave(key.id, permissionsFromForm(f));
          }}
        >
          <KeyPermissionFields value={key.permissions} />
          <button className="dev-secondary" disabled={busy}>
            Save key restrictions
          </button>
        </form>
      )}
    </div>
  );
}
