const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('../helpers/route-harness.cjs');

const route = 'app/api/auth/request-password-reset/route.ts';

test('password reset keeps unknown accounts private', async () => {
  const h = harness();
  const response = await h.call(route, { email: 'missing@example.com' });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(h.mails.length, 0);
  assert.doesNotMatch(JSON.stringify(response.body), /not found|no account/i);
});

test('password reset sends a branded custom-site action link for an existing account', async () => {
  const h = harness();
  h.setAuthUser({ email: 'seller@example.com', displayName: 'Test Seller' });
  const response = await h.call(route, { email: 'SELLER@example.com' });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(h.mails.length, 1);
  assert.equal(h.mails[0].email, 'seller@example.com');
  assert.match(h.mails[0].resetUrl, /^https:\/\/auronixcommerce\.com\/reset-password\?code=/);
  assert.doesNotMatch(h.mails[0].resetUrl, /identity\.example\.test/);
});

test('password reset never sends a provider-hosted fallback when branded delivery fails', async () => {
 const h=harness(); h.setAuthUser({email:'seller@example.com'}); h.failPasswordResetMail(true);
 const r=await h.call(route,{email:'seller@example.com'});assert.equal(r.status,200);assert.equal(r.body.success,true);assert.equal(h.mails.length,0);assert.equal(Object.values(h.data.emailDeliveryLogs)[0].status,'failed');assert.doesNotMatch(JSON.stringify(r.body),/smtp|failed|provider/i);
});

test('password reset reports a general service error when account lookup is unavailable', async () => {
  const h = harness();
  h.failAuth(Object.assign(new Error('Test account service unavailable'), { code: 'auth/internal-error' }));
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await h.call(route, { email: 'seller@example.com' });
    assert.equal(response.status, 500);
    assert.equal(response.body.error, 'Unable to process the password reset request.');
  } finally {
    console.error = originalError;
  }
});

test('generation failures are logged without sending a Firebase default email',async()=>{
 const h=harness();h.setAuthUser({email:'seller@example.com'});h.failResetGeneration(true);
 const r=await h.call(route,{email:'seller@example.com'});assert.equal(r.status,200);assert.equal(h.mails.length,0);assert.equal(Object.values(h.data.emailDeliveryLogs)[0].status,'failed');
});
