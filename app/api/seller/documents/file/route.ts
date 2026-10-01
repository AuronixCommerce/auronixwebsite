import { adminDb } from '@/lib/firebase-admin';
import { getPrivateObject } from '@/lib/server-r2';
import { cleanText, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  try{
    const {uid}=await sellerContext(request); const id=cleanText(new URL(request.url).searchParams.get('id'),160);
    if(!id)return Response.json({error:'Document ID is required.'},{status:400});
    const snapshot=await adminDb.ref(`sellerDocuments/${uid}/${id}`).get(); if(!snapshot.exists())return Response.json({error:'Document not found.'},{status:404});
    const item=snapshot.val()||{}; if(!item.storageKey)return Response.json({error:'This document file is unavailable.'},{status:404});
    const object=await getPrivateObject(String(item.storageKey)); const fileName=cleanText(item.originalName||item.name||'document',180).replace(/["\r\n]/g,'');
    return new Response(object.body as any,{status:200,headers:{'Content-Type':object.contentType,'Content-Length':String(object.contentLength||object.body.length),'Content-Disposition':`attachment; filename="${fileName}"`,'Cache-Control':'private, no-store'}});
  }catch(error){return Response.json({error:userFacingError(error,'Unable to open this document.')},{status:500});}
}
