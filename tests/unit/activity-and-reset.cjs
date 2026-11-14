const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('../helpers/route-harness.cjs');
test('activity confirmations use stable queue keys, change with revisions, and tolerate delivery failures',async()=>{
 const h=harness(),{activityEmail}=h.load('lib/email/activity.ts'),v={to:'CUSTOMER@example.test',event:'profile-updated',title:'Profile saved',body:'Your profile was updated.',reference:'uid1',revision:1,href:'/seller/settings'};
 assert.equal(await activityEmail(v),'sent');await activityEmail(v);assert.equal(h.mails[0].idempotencyKey,h.mails[1].idempotencyKey);assert.equal(h.mails[0].to,'customer@example.test');assert.equal(h.mails[0].deferDelivery,true);assert.match(h.mails[0].body,/https:\/\/auronixcommerce.com\/seller\/settings/);
 await activityEmail({...v,revision:2});assert.notEqual(h.mails[0].idempotencyKey,h.mails[2].idempotencyKey);h.failMail(true);assert.equal(await activityEmail(v),'failed');
});
test('website reset consumes the provider credential and sends confirmation only to the returned account email',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;process.env.NEXT_PUBLIC_FIREBASE_API_KEY='test-key';let consumed=false,calls=0;const h=harness();
 try{
  global.fetch=async(url,options)=>{calls++;assert.match(url,/accounts:resetPassword/);const b=JSON.parse(options.body);assert.equal(b.oobCode,'valid-code');assert.equal(b.newPassword,'new-password-123');assert.equal(b.email,undefined);if(consumed)return new Response(JSON.stringify({error:{message:'INVALID_OOB_CODE'}}),{status:400});consumed=true;return new Response(JSON.stringify({email:'owner@example.test',requestType:'PASSWORD_RESET'}));};
  let r=await h.call('app/api/auth/reset-password/route.ts',{code:'valid-code',password:'new-password-123',email:'attacker@example.test'});assert.equal(r.status,200);assert.equal(r.body.success,true);assert.equal(h.mails[0].to,'owner@example.test');assert.doesNotMatch(JSON.stringify(h.mails),/valid-code|new-password-123|attacker@example/);
  r=await h.call('app/api/auth/reset-password/route.ts',{code:'valid-code',password:'new-password-123'});assert.equal(r.status,400);assert.equal(h.mails.length,1);assert.equal(calls,2);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;else process.env.NEXT_PUBLIC_FIREBASE_API_KEY=oldKey;}
});
test('completed password reset stays successful when its confirmation email is unavailable',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;process.env.NEXT_PUBLIC_FIREBASE_API_KEY='test-key';const h=harness();h.failMail(true);
 try{global.fetch=async()=>new Response(JSON.stringify({email:'owner@example.test'}));const r=await h.call('app/api/auth/reset-password/route.ts',{code:'valid-code',password:'new-password-123'});assert.equal(r.status,200);assert.equal(r.body.success,true);}finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;else process.env.NEXT_PUBLIC_FIREBASE_API_KEY=oldKey;}
});

test('reset completion rejects weak local input and provider failures without sending a success email',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;process.env.NEXT_PUBLIC_FIREBASE_API_KEY='test-key';let calls=0;const h=harness();
 try{global.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'EXPIRED_OOB_CODE'}}),{status:400});};let r=await h.call('app/api/auth/reset-password/route.ts',{code:'expired-code',password:'short'});assert.equal(r.status,400);assert.equal(calls,0);r=await h.call('app/api/auth/reset-password/route.ts',{code:'expired-code',password:'new-password-123'});assert.equal(r.status,400);assert.match(r.body.error,/expired/);assert.equal(h.mails.length,0);}finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;else process.env.NEXT_PUBLIC_FIREBASE_API_KEY=oldKey;}
});
