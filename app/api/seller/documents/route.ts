import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { deletePrivateObject, putPrivateObject, safeObjectName } from '@/lib/server-r2';
import { cleanText, listFromNode, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const maxBytes = 20 * 1024 * 1024;
const allowed = new Set(['pdf','png','jpg','jpeg','webp','csv','xlsx','xls','doc','docx']);
const categories = new Set(['business-documents','ein','resale-certificate','supplier-invoice','authorization-letter','catalog','verification','marketplace','other']);
const safeView = (item: Record<string, any>) => { const { storageKey, ...safe } = item; return safe; };

export async function GET(request: Request) {
  try {
    const { uid } = await sellerContext(request); const snapshot = await adminDb.ref(`sellerDocuments/${uid}`).get();
    const documents = listFromNode<Record<string, any>>(snapshot.val()).map(safeView).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));
    return NextResponse.json({ documents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch(error) { return NextResponse.json({ error:userFacingError(error,'Unable to load documents.') },{status:401}); }
}

export async function POST(request: Request) {
  try {
    const { uid } = await sellerContext(request); const form = await request.formData(); const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({error:'Choose a document to upload.'},{status:400});
    const extension=file.name.split('.').pop()?.toLowerCase()||''; if(!allowed.has(extension))return NextResponse.json({error:'This document type is not supported.'},{status:400});
    if(file.size<=0||file.size>maxBytes)return NextResponse.json({error:'Documents must be smaller than 20 MB.'},{status:400});
    const rawCategory=cleanText(form.get('category'),80).toLowerCase(); const category=categories.has(rawCategory)?rawCategory:'other';
    const name=cleanText(form.get('name')||file.name,180); const expiresRaw=cleanText(form.get('expiresAt'),40); const expiresAt=expiresRaw?Number(expiresRaw):null;
    if(expiresAt!==null&&(!Number.isFinite(expiresAt)||expiresAt<Date.now()))return NextResponse.json({error:'Expiration must be a future date.'},{status:400});
    const ref=adminDb.ref(`sellerDocuments/${uid}`).push(); if(!ref.key)throw new Error('Unable to create document reference.');
    const key=`seller-documents/${uid}/${ref.key}/${safeObjectName(file.name)}`; const buffer=Buffer.from(await file.arrayBuffer()); await putPrivateObject(key,buffer,file.type||'application/octet-stream');
    const now=Date.now(); const item={id:ref.key,name,originalName:file.name,category,type:extension.toUpperCase(),status:'uploaded',contentType:file.type||'application/octet-stream',size:file.size,storageKey:key,expiresAt,createdAt:now,updatedAt:now}; await ref.set(item);
    const notification=adminDb.ref(`sellerNotifications/${uid}`).push(); await notification.set({id:notification.key,type:'document',title:'Document uploaded',message:`${name} is now stored in your secure seller vault.`,documentId:ref.key,createdAt:now});
    return NextResponse.json({success:true,document:safeView(item)},{status:201});
  } catch(error){console.error('Seller document upload failed:',error);return NextResponse.json({error:userFacingError(error,'Unable to upload this document.')},{status:500});}
}

export async function DELETE(request: Request) {
  try { const {uid}=await sellerContext(request); const id=cleanText(new URL(request.url).searchParams.get('id'),160); if(!id)return NextResponse.json({error:'Document ID is required.'},{status:400}); const ref=adminDb.ref(`sellerDocuments/${uid}/${id}`); const snapshot=await ref.get(); if(!snapshot.exists())return NextResponse.json({error:'Document not found.'},{status:404}); const item=snapshot.val()||{}; if(item.storageKey)await deletePrivateObject(String(item.storageKey)).catch(error=>console.error('Document object cleanup failed:',error)); await ref.remove(); return NextResponse.json({success:true}); }
  catch(error){return NextResponse.json({error:userFacingError(error,'Unable to delete this document.')},{status:400});}
}
