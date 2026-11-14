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

export async function downloadPaymentReceipt(id: string, uid?: string) {
 const token=await auth.currentUser?.getIdToken(); if(!token)throw Error('Sign in to download a receipt.');
 const r=await fetch('/api/developers/receipts/'+encodeURIComponent(id)+(uid?'?uid='+encodeURIComponent(uid):''),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 if(!r.ok){const d=await r.json();throw Error(d.error?.message||'Receipt unavailable.');}
 const url=URL.createObjectURL(await r.blob()),link=document.createElement('a');link.href=url;link.download='Auronix-receipt-'+id+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
