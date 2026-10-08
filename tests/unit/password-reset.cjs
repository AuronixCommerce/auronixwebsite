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
  assert.match(h.mails[0].resetUrl, /^https:\/\/auronixcommerce\.com\/reset-password\?oobCode=/);
  assert.doesNotMatch(h.mails[0].resetUrl, /identity\.example\.test/);
});

test('password reset retries securely without revealing the primary delivery failure', async () => {
  const h = harness();
  h.setAuthUser({ email: 'seller@example.com', displayName: '' });
  h.failPasswordResetMail(true);
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await h.call(route, { email: 'seller@example.com' });
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(h.mails[0].type, 'password-reset-fallback');
    assert.equal(Object.values(h.data.emailDeliveryLogs)[0].status, 'sent');
    assert.doesNotMatch(JSON.stringify(response.body), /delivery|smtp|provider|unavailable|failed/i);
  } finally {
    console.error = originalError;
  }
});

test('password reset records failure when both secure delivery paths fail', async () => {
  const h = harness();
  h.setAuthUser({ email: 'seller@example.com', displayName: '' });
  h.failPasswordResetMail(true);
  h.failPasswordResetFallback(true);
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await h.call(route, { email: 'seller@example.com' });
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const deliveries = Object.values(h.data.emailDeliveryLogs || {});
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, 'failed');
    assert.match(deliveries[0].error, /both secure delivery attempts/i);
  } finally {
    console.error = originalError;
  }
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
