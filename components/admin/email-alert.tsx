"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
export function AdminEmailAlert() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const r = await fetch("/api/admin/email-delivery", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (r.ok) {
          const d = await r.json();
          if (alive) setCount(d.alerts?.length || 0);
        }
      } catch {}
    }
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return count > 0 ? (
    <div role="status" className="ac-alert ac-alert-error mb-5">
      <Link href="/admin/email-delivery">
        {count} email delivery {count === 1 ? "alert needs" : "alerts need"}{" "}
        attention. View the retry queue →
      </Link>
    </div>
  ) : null;
}
