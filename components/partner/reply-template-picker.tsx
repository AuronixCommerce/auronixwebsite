"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { DEFAULT_TEMPLATES } from "@/lib/partner/model";
export function ReplyTemplatePicker({
  onSelect,
}: {
  onSelect: (body: string) => void;
}) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const r = await fetch("/api/admin/operations?view=templates", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const d = await r.json();
        if (r.ok && alive) setTemplates(d.templates);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);
  return (
    <label className="op-template-picker">
      Reply template
      <select
        defaultValue=""
        onChange={(e) => {
          const t = templates.find((t) => t.id === e.target.value);
          if (t) onSelect(t.body);
          e.target.value = "";
        }}
      >
        <option value="">Insert an editable template</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </label>
  );
}
