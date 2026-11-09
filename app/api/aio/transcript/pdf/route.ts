import { decryptPdfDownload } from '@/lib/documents/private-download';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
 const token=new URL(request.url).searchParams.get('token')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:'Download not found.'},{status:404,headers});
 try{
  const key=createHash('sha256').update(token).digest('hex');const ref=adminDb.ref(`aioTranscriptDownloads/${key}`);const snap=await ref.get();const data=snap.val();
  if(!data||typeof data.ciphertext!=='string')return NextResponse.json({error:'Download not found.'},{status:404,headers});
  if(!Number.isFinite(Number(data.expiresAt))||Number(data.expiresAt)<=Date.now()){await ref.remove();return NextResponse.json({error:'This download expired. Request a new transcript from chat.'},{status:410,headers});}
  return new NextResponse(decryptPdfDownload(data,token),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="auronix-conversation.pdf"','X-Content-Type-Options':'nosniff'}});
 }catch{return NextResponse.json({error:'Download is temporarily unavailable.'},{status:503,headers});}
}
