const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const routePath = path.resolve(__dirname, '../../app/api/webhooks/whatsapp/route.ts');
const output = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const route = { exports: {} };
new Function('require', 'module', 'exports', output)(require, route, route.exports);

const testToken = 'test-meta-verification-token';

test('WhatsApp webhook returns the exact Meta challenge for a valid token', async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = testToken;
  const response = await route.exports.GET(new Request(
    `http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${testToken}&hub.challenge=123456789`
  ));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '123456789');
  assert.match(response.headers.get('content-type'), /^text\/plain/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('WhatsApp webhook rejects invalid or unconfigured verification tokens', async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = testToken;
  const invalid = await route.exports.GET(new Request(
    'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'
  ));
  assert.equal(invalid.status, 403);
  assert.equal(await invalid.text(), 'Forbidden');

  delete process.env.WHATSAPP_VERIFY_TOKEN;
  const unconfigured = await route.exports.GET(new Request(
    'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=&hub.challenge=123'
  ));
  assert.equal(unconfigured.status, 403);
});

test('WhatsApp webhook acknowledges event deliveries', async () => {
  const response = await route.exports.POST();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'EVENT_RECEIVED');
});
