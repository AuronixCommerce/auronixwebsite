const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('../helpers/route-harness.cjs');
const draftRoute = 'app/api/seller/draft/route.ts', applyRoute = 'app/api/seller/apply/route.ts';
const form = { fullName: 'Test Seller', businessName: 'Test Wholesale', businessEmail: 'seller@example.com', preferredContact: 'business', phone: '+1 555 123 4567', country: 'United States', address: '123 Test Street', city: 'Miami', state: 'Florida', zipCode: '33101', businessType: 'Wholesaler', productCategories: 'Home', businessInformation: 'We supply authorized home and kitchen products to retailers.', whyWorkWithAuronix: 'We want to expand our authorized retail distribution.', sellerPolicyAgreement: true, contactAgreement: true };
process.env.SELLER_APPLICATION_OTP_SECRET = 'local-test-secret-at-least-24-characters';
async function verified(h) { const start = await h.call(draftRoute, { action: 'start', phone: form.phone }); assert.equal(start.status, 200); const auth = { draftId: start.body.draftId, resumeId: start.body.resumeId }; assert.equal((await h.call(draftRoute, { action: 'save', ...auth, form, step: 2 })).status, 200); assert.equal((await h.call(draftRoute, { action: 'email-request', ...auth, emailType: 'business', email: form.businessEmail })).status, 200); assert.equal((await h.call(draftRoute, { action: 'email-verify', ...auth, code: h.getCode() })).status, 200); return auth; }
test('draft, email, resume, submission and duplicate prevention need no phone verification', async () => { const h = harness(), auth = await verified(h); const resumed = await h.call(draftRoute, { action: 'resume', resumeId: auth.resumeId }); assert.equal(resumed.body.emailVerified, true); const result = await h.call(applyRoute, { ...auth, form }); assert.equal(result.status, 200); assert.equal(h.data.sellerApplications[result.body.applicationId].status, 'pending'); assert.equal(h.data.sellerApplicationDrafts[auth.draftId].status, 'submitted'); assert.equal((await h.call(applyRoute, { ...auth, form })).status, 403); assert.equal((await h.call(draftRoute, { action: 'resume', resumeId: auth.resumeId })).body.submitted, true); assert.ok(!/whatsapp/i.test(JSON.stringify(h.data))); assert.ok(!h.accesses.some(p => /whatsapp/i.test(p))); });
test('invalid phone, incorrect code, unverified email, tampering and expired drafts remain blocked', async () => { const h = harness(); assert.equal((await h.call(draftRoute, { action: 'start', phone: '1' })).status, 400); const start = await h.call(draftRoute, { action: 'start', phone: form.phone }); const auth = { draftId: start.body.draftId, resumeId: start.body.resumeId }; assert.equal((await h.call(applyRoute, { ...auth, form })).status, 403); await h.call(draftRoute, { action: 'email-request', ...auth, email: form.businessEmail }); assert.equal((await h.call(draftRoute, { action: 'email-verify', ...auth, code: '000000' })).status, 400); assert.equal((await h.call(draftRoute, { action: 'save', ...auth, resumeId: 'AX-TAMPERED', form })).status, 401); await h.ref('sellerApplicationDrafts/' + auth.draftId).update({ expiresAt: 0 }); assert.equal((await h.call(draftRoute, { action: 'save', ...auth, form })).status, 401); });
test('legacy draft verification fields do not gate a valid email-verified submission', async () => { const h = harness(), auth = await verified(h); await h.ref('sellerApplicationDrafts/' + auth.draftId).update({ whatsappVerified: false, whatsappVerificationId: 'retired' }); assert.equal((await h.call(applyRoute, { ...auth, form })).status, 200); });

test('submitted legacy resume IDs recover tracking without exposing or reopening draft data', async () => {
  const h = harness(), auth = await verified(h);
  const result = await h.call(applyRoute, { ...auth, form });
  assert.match(result.body.trackingId, /^AX-T-[A-F0-9]{24}$/);
  h.data.sellerApplicationResumeIndex = {};
  h.data.sellerApplicationDrafts[auth.draftId].expiresAt = 0;
  const resumed = await h.call(draftRoute, { action: 'resume', resumeId: auth.resumeId });
  assert.equal(resumed.body.submitted, true);
  assert.equal(resumed.body.trackingId, result.body.trackingId);
  assert.equal(resumed.body.form, undefined);
  assert.equal((await h.call(draftRoute, { action: 'save', ...auth, form })).status, 409);
});

test('confirmation email failure never rolls back a submitted application or its tracking ID', async () => {
  const h = harness(), auth = await verified(h);
  h.failMail(true);
  const result = await h.call(applyRoute, { ...auth, form });
  assert.equal(result.status, 200);
  assert.equal(result.body.emailSent, false);
  assert.equal(h.data.sellerApplications[result.body.applicationId].notificationPending, true);
  assert.equal(h.data.sellerApplicationDrafts[auth.draftId].status, 'submitted');
});
