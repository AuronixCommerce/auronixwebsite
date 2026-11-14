import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
export type AdminNotice = { id: string; category: string; title: string; summary: string; href: string; reference: string; createdAt: number; readAt: number; doneAt: number };
const text = (v: unknown, n=200) => String(v ?? "").trim().slice(0,n);
const sources = [
  ["suppliers","Suppliers","/admin/suppliers"], ["sellerApplications","Applications","/admin/sellers"],
  ["tickets","Support","/admin/tickets"], ["partnerDealRooms","Deal rooms","/admin/deal-room"], ["contactMessages","Messages","/admin/contact"],
  ["partnershipBookings","Bookings","/admin/operations"], ["websiteFeedback","Feedback","/admin/operations"],
  ["aioDeveloperAccounts","Developers","/admin/developers"], ["aioDeveloperInvoiceQueue","Payments","/admin/developers"],
  ["emailAlerts","Email delivery","/admin/email-delivery"],
] as const;
export const noticeId = (source: string, key: string, event: string, at: number) => createHash("sha256").update(JSON.stringify([source,key,event,at])).digest("hex");
export async function adminNotifications(uid: string) {
  const unavailable: string[] = [], items: AdminNotice[] = [];
  const state = (await adminDb.ref(`users/${uid}/adminNotificationTasks`).get()).val() || {};
  const snapshots = await Promise.all(sources.map(async ([path,category,href]) => {
    try { return {path,category,href,data:(await adminDb.ref(path).limitToLast(300).get()).val() || {}}; }
    catch { unavailable.push(category); return {path,category,href,data:{}}; }
  }));
  for (const {path,category,href,data} of snapshots) for (const [key,v] of Object.entries<any>(data)) {
    if (!v || typeof v !== 'object') continue;
    const createdAt = Number(v.createdAt || v.submittedAt || 0);
    const person = text(v.companyName || v.businessName || v.name || v.fullName || v.contactName || v.subject || v.email || "New activity",100);
    const title = path === "aioDeveloperInvoiceQueue" ? `Credit request · ${Number(v.credits)||0} credits` : path === "emailAlerts" ? "Email delivery needs attention" : path === "tickets" ? `Support request · ${text(v.subject,100)}` : `${category} · ${person}`;
    const base = new URL(href,"https://auronixcommerce.com");
    base.searchParams.set("item",key);
    if (path === "aioDeveloperAccounts") base.searchParams.set("uid", key);
    if (path === "aioDeveloperInvoiceQueue") {base.searchParams.set("uid",text(v.uid));base.searchParams.set("invoice",key);}
    if (category === "Bookings" || category === "Feedback") base.searchParams.set("tab",category.toLowerCase());
    const add = (event: string, at: number, eventTitle: string, summary: string) => {
      if (!Number.isFinite(at) || at <= 0) return;
      const id=noticeId(path,key,event,at), task=state[id] || {};
      items.push({id,category,title:eventTitle,summary:text(summary,240),reference:key,href:base.pathname+base.search,createdAt:at,readAt:Number(task.readAt)||0,doneAt:Number(task.doneAt)||0});
    };
    add("created",createdAt,title,`${text(v.status || "received",40).replace(/_/g," ")} · ${text(v.subject || v.category || v.useCase || v.message || "Ready to review",180)}`);
    const updatedAt=Number(v.updatedAt || v.submission?.submittedAt || 0);
    if(path === "aioDeveloperInvoiceQueue" && v.status === "payment_submitted" && updatedAt>createdAt) add(`payment:${Number(v.version)||0}`,updatedAt,"Payment submitted for verification",`Review the transfer reference for ${Number(v.credits)||0} credits. Confirm the actual received payment before approval.`);
    if(path === "partnershipBookings" && updatedAt>createdAt) add("booking-update",updatedAt,"Partnership booking updated",text(v.status || "Booking details changed"));
    const repliedAt=Number(v.lastCustomerReplyAt || 0);
    if (repliedAt>createdAt) add("reply",repliedAt,`New customer reply · ${text(v.subject || person,100)}`,"Open the conversation to read and respond.");
    if (path === "partnerDealRooms") for(const [messageId,message] of Object.entries<any>(v.messages || {})) if(message.senderRole === "seller") add(`message:${messageId}`, Number(message.createdAt || 0), "New partner Deal Room message", text(message.body,240));
    if (path === "suppliers") {
      for (const [docId,doc] of Object.entries<any>(v.documents || {})) add(`document:${docId}`,Number(doc.uploadedAt || 0),`Supplier document · ${text(doc.name,100)}`,`${person} · ${text(doc.status || "pending review")}`);
      for (const [entryId,entry] of Object.entries<any>(v.timeline || {})) if(entry.actor === "supplier" && entry.type === "reply") add(`reply:${entryId}`,Number(entry.createdAt || 0),`Supplier reply · ${person}`,text(entry.message,240));
    }
  }
  const ids=new Set(items.map(i=>i.id));
  for(const [id,task] of Object.entries<any>(state)) if((task.doneAt || task.readAt) && task.entry && !ids.has(id)) {
    const e=task.entry;
    try {
      const url=new URL(String(e.href),"https://auronixcommerce.com");
      if(!/^[a-f0-9]{64}$/.test(id) || url.origin!=="https://auronixcommerce.com" || !sources.some(([,category,href])=>category===e.category && url.pathname===href) || !Number.isFinite(Number(e.createdAt)) || Number(e.createdAt)<=0) continue;
      items.push({id,category:e.category,title:`${e.category} task`,summary:"Saved notification task.",reference:text(e.reference,160),href:url.pathname+url.search,createdAt:Number(e.createdAt),readAt:Number(task.readAt)||0,doneAt:Number(task.doneAt)||0});
    } catch { /* Ignore malformed stored task state. */ }
  }
  items.sort((a,b)=>b.createdAt-a.createdAt || a.id.localeCompare(b.id));
  return {items, unread:items.filter(i=>!i.readAt&&!i.doneAt).length, pending:items.filter(i=>!i.doneAt).length, unavailable, sourceLimit:300};
}
