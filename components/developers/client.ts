"use client";
import { auth } from "@/lib/firebase";
export async function developerFetch(path: string, body?: any, admin = false) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw Error("Sign in to continue.");
  const r = await fetch(
    admin ? "/api/admin/developers" + path : "/api/developers/" + path,
    {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await r.json();
  if (!r.ok)
    throw Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message || "Please retry.",
    );
  return data;
}
