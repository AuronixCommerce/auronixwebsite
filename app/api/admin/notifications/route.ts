import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { adminNotifications } from "@/lib/admin/notifications";
export const dynamic="force-dynamic";
const reply=(v:object,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){let u;try{u=await requireAdmin(request);}catch{return reply({error:"Admin access with a valid security session is required."},401);}try{return reply(await adminNotifications(u.uid));}catch{return reply({error:"Unable to load notifications. Please refresh and retry."},503);}}
export async function POST(request:Request){
  let u;try{u=await requireAdmin(request);}catch{return reply({error:"Admin access with a valid security session is required."},401);}
  try{
    const b=await request.json();
    if(!/^[a-f0-9]{64}$/.test(String(b.id))||!["read","done","undo"].includes(b.action))return reply({error:"Choose a valid notification action."},400);
    const data=await adminNotifications(u.uid),item=data.items.find(i=>i.id===b.id);
    if(!item)return reply({error:"This notification is no longer available."},404);
    const ref=adminDb.ref(`users/${u.uid}/adminNotificationTasks/${b.id}`), now=Date.now();
    await ref.transaction((v)=>({...(v||{}),readAt:Number(v?.readAt)||now,doneAt:b.action==="done"?(Number(v?.doneAt)||now):b.action==="undo"?0:Number(v?.doneAt)||0,updatedAt:now,
      entry:{id:item.id,category:item.category,title:`${item.category} task`,summary:"Completed from the notification inbox.",reference:item.reference,href:item.href,createdAt:item.createdAt}}));
    return reply({success:true});
  }catch{return reply({error:"Unable to update this notification. Please retry."},503);}
}
