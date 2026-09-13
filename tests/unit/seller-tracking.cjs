const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('../helpers/route-harness.cjs');
const track='app/api/seller/application/track/route.ts',admin='app/api/admin/sellers/request-changes/route.ts';
const id='legacy-application-123';
const application={id,status:'pending',fullName:'Test Seller',businessName:'Test Business',businessEmail:'seller@example.com',personalEmail:'personal@example.com',preferredContactEmail:'seller@example.com',preferredContactType:'business',phone:'+15551234567',country:'US',address:'Test Street',city:'Miami',state:'FL',zipCode:'33101',businessType:'Wholesaler',productCategories:'Home',businessInformation:'We distribute authorized products to retail businesses.',whyWorkWithAuronix:'We want to grow our authorized retail distribution.',createdAt:Date.now(),updatedAt:Date.now(),aiScreening:{private:'Never expose internal evaluation'},invitationTokenHash:'private'};
process.env.SELLER_APPLICATION_OTP_SECRET='a-local-test-secret-at-least-24-characters';
const fixture=()=>harness({sellerApplications:{[id]:application}});
async function challenge(h,emailType='business',email='seller@example.com') {const response=await h.call(track,{action:'request-code',trackingId:id,emailType,email});assert.equal(response.status,200);return {challengeId:response.body.challengeId,code:h.mails.at(-1)?.subject.match(/^\d{6}/)?.[0]};}
async function login(h){const body=await challenge(h);const r=await h.call(track,{action:'verify-code',...body});assert.equal(r.status,200);return {token:r.body.token};}
test('no record details before matching email OTP; successful verification is single-use and scoped',async()=>{
 const h=fixture();assert.equal((await h.call(track,{action:'status',trackingId:id})).status,401);
 const invalid=await h.call(track,{action:'request-code',trackingId:id,email:'wrong@example.com',emailType:'business'});assert.equal(invalid.status,200);assert.equal(h.mails.length,0);assert.ok(!JSON.stringify(invalid.body).includes('Test Seller'));
 const c=await challenge(h,'personal','personal@example.com');assert.equal(h.mails.at(-1).to,'personal@example.com');
 const verified=await h.call(track,{action:'verify-code',...c});assert.equal(verified.status,200);assert.equal((await h.call(track,{action:'verify-code',...c})).status,400);
 const result=await h.call(track,{action:'status',token:verified.body.token});assert.equal(result.body.application.status,'pending');assert.equal(result.body.verifiedEmail,'personal@example.com');assert.ok(!/private|invitationTokenHash|aiScreening/.test(JSON.stringify(result.body)));
 await h.call(track,{action:'logout',token:verified.body.token});assert.equal((await h.call(track,{action:'status',token:verified.body.token})).status,401);
});
test('incorrect attempts, expiry, throttling and expired sessions stay blocked',async()=>{
 const h=fixture(),c=await challenge(h);for(let i=0;i<5;i++)assert.equal((await h.call(track,{action:'verify-code',challengeId:c.challengeId,code:'000000'})).status,400);
 assert.equal((await h.call(track,{action:'verify-code',...c})).status,400);
 const expired=await challenge(h);h.data.sellerTrackingChallenges[expired.challengeId].expiresAt=0;assert.equal((await h.call(track,{action:'verify-code',...expired})).status,400);
 const session=await login(h);await challenge(h);assert.equal(h.mails.length,3);
 for(const value of Object.values(h.data.sellerTrackingSessions))value.expiresAt=0;assert.equal((await h.call(track,{action:'status',...session})).status,401);
});
test('admin requests corrections, applicant edits safely, notifications send and reviewed applications lock',async()=>{
 const h=fixture(),session=await login(h);
 const response=await h.call(admin,{applicationId:id,message:'Please correct your business address.'});assert.equal(response.status,200);assert.equal(h.data.sellerApplications[id].status,'changes_requested');assert.equal(h.mails.at(-1).to,'seller@example.com');
 const status=await h.call(track,{action:'status',...session});assert.equal(status.body.application.canEdit,true);assert.match(status.body.application.reviewMessage,/business address/);
 const edit=await h.call(track,{action:'edit',...session,form:{address:'Corrected address',businessEmail:'attacker@example.com',status:'approved',aiAutoApproved:true}});assert.equal(edit.status,200);assert.equal(h.data.sellerApplications[id].address,'Corrected address');assert.equal(h.data.sellerApplications[id].businessEmail,'seller@example.com');assert.equal(h.data.sellerApplications[id].status,'pending');assert.equal(h.data.sellerApplications[id].revision,1);assert.equal(h.data.sellerApplications[id].reviewMessage,'');
 await h.ref('sellerApplications/'+id).update({status:'approved'});assert.equal((await h.call(track,{action:'edit',...session,form:{address:'Blocked'}})).status,409);
 h.setAdmin(false);assert.notEqual((await h.call(admin,{applicationId:id,message:'Unauthorized change'})).status,200);
});
test('branded errors preserve useful validation and hide SDK/configuration details',()=>{
 const map=fixture().load('lib/user-facing-error.ts').userFacingError;
 assert.match(map({code:'auth/invalid-credential',message:'Firebase: Error (auth/invalid-credential).'}),/^Auronix Auth:/);
 for(const message of ['Firebase Admin environment variables are not configured.','Firebase: Error (auth/internal-error).','SMTP authentication rejected'])assert.doesNotMatch(map(new Error(message)),/firebase|smtp|auth\/|environment/i);
 assert.equal(map(new Error('Phone number is required.')),'Phone number is required.');
});
