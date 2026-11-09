import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, randomInt, randomUUID } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { sendProfessionalEmail } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  challengeId: z.string().uuid().optional(), code: z.string().regex(/^\d{6}$/).optional(),
  messages: z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(12000)})).min(1).max(100),
});
const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export async function POST(request:Request) {
  try {
    if (Number(request.headers.get('content-length')) > 200000) return NextResponse.json({success:false,error:'Conversation is too large.'},{status:413});
    const raw = await request.text();
    if (raw.length > 200000) return NextResponse.json({success:false,error:'Conversation is too large.'},{status:413});
    let body; try {body = JSON.parse(raw);} catch {return NextResponse.json({success:false,error:'Invalid request.'},{status:400});}
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({success:false,error:'Enter a valid email and a nonempty conversation.'},{status:400});
    const {email,challengeId,code,messages} = parsed.data;
    await protectPublicRequest(request,challengeId ? 'aio-transcript-verify':'aio-transcript-email',body,{limit:challengeId ? 12:3,windowMs:3600000});
    if (!challengeId) {
      const id=randomUUID(); const verificationCode=String(randomInt(100000,1000000));
      const ref=adminDb.ref(`aioTranscriptChallenges/${id}`);
      await ref.set({emailHash:digest(email),codeHash:digest(`${id}:${verificationCode}`),expiresAt:Date.now()+600000,attempts:0,used:false});
      try { await sendProfessionalEmail({to:email,subject:'Verify your AIO transcript request',body:`Your AIO transcript verification code is ${verificationCode}. It expires in 10 minutes. Enter it only in the Auronix chat. If you did not request a transcript, ignore this message.`},'notification'); }
      catch(error) {await ref.remove();throw error;}
      return NextResponse.json({success:true,challengeId:id});
    }
    if (!code) return NextResponse.json({success:false,error:'Enter the six-digit verification code.'},{status:400});
    const ref=adminDb.ref(`aioTranscriptChallenges/${challengeId}`);
    const result=await ref.transaction(current=>{
      if (!current || current.used || current.expiresAt<Date.now() || current.attempts>=5 || current.emailHash!==digest(email)) return;
      return {...current,attempts:current.attempts+1,used:current.codeHash===digest(`${challengeId}:${code}`)};
    });
    if (!result.committed || !result.snapshot.val()?.used) return NextResponse.json({success:false,error:'The code is invalid or expired. Cancel and request a new code if needed.'},{status:400});
    const transcript=messages.map(m=>`${m.role==='user'?'You':'AIO'}\n${m.content}`).join('\n\n');
    await sendProfessionalEmail({to:email,subject:'Your Auronix AI conversation',body:`Your requested AIO conversation copy\n\n${transcript}\n\nAI replies can contain errors. Verify important details. This transcript was supplied from your browser.`},'notification');
    return NextResponse.json({success:true});
  } catch(error) {
    const blocked=publicRequestErrorResponse(error); if(blocked) return NextResponse.json(blocked.body,{status:blocked.status});
    console.error('[AIO transcript] Delivery failed',error instanceof Error ? error.name : 'Error');
    return NextResponse.json({success:false,error:'Email could not be sent. Please retry with a new verification code or download your conversation.'},{status:503});
  }
}
