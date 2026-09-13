// Exercise the real route handlers with an in-memory RTDB adapter; no live writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function harness() {
    const data = {};
    let sequence = 0, code = '';
    const accesses = [];
    const read = p => p.split('/').filter(Boolean).reduce((v, k) => v?.[k], data);
    const write = (p, v) => { const keys = p.split('/').filter(Boolean), key = keys.pop(); let obj = data; for (const k of keys)
        obj = obj[k] ??= {}; if (v === null)
        delete obj[key];
    else
        obj[key] = structuredClone(v); };
    const snap = p => ({ exists: () => read(p) != null, val: () => structuredClone(read(p) ?? null) });
    const ref = p => { accesses.push(p); return { key: p.split('/').pop(), get: async () => snap(p), set: async (v) => write(p, v), update: async (v) => write(p, { ...read(p), ...v }), remove: async () => write(p, null), push: () => ref(p + '/test-' + (++sequence)), transaction: async (fn) => { const v = fn(structuredClone(read(p) ?? null)); if (v !== undefined)
            write(p, v); return { committed: v !== undefined, snapshot: snap(p) }; } }; };
    const mocks = {
        '@/lib/firebase-admin': { adminDb: { ref }, adminAuth: { getUserByEmail: async () => { throw Object.assign(new Error('No account'), { code: 'auth/user-not-found' }); } } },
        '@/lib/server-seller-invitations': { normalizeEmail: v => String(v || '').trim().toLowerCase() },
        '@/lib/server-protection': { protectPublicRequest: async () => { }, publicRequestErrorResponse: () => null },
        '@/lib/server-mail': { sendSellerEmailVerification: async (value) => { code = value.code; }, sendSellerResumeIdEmail: async () => { } },
    };
    const cache = {};
    function load(file) { if (cache[file])
        return cache[file]; const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const mod = { exports: {} }; const req = id => { if (mocks[id])
        return mocks[id]; if (id.startsWith('@/'))
        return load(id.slice(2) + '.ts'); return require(id); }; new Function('require', 'module', 'exports', output)(req, mod, mod.exports); return cache[file] = mod.exports; }
    const call = async (file, body) => { const response = await load(file).POST(new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: response.status, body: await response.json() }; };
    return { data, accesses, ref, call, getCode: () => code };
}
const draftRoute = 'app/api/seller/draft/route.ts', applyRoute = 'app/api/seller/apply/route.ts';
const form = { fullName: 'Test Seller', businessName: 'Test Wholesale', businessEmail: 'seller@example.com', preferredContact: 'business', phone: '+1 555 123 4567', country: 'United States', address: '123 Test Street', city: 'Miami', state: 'Florida', zipCode: '33101', businessType: 'Wholesaler', productCategories: 'Home', businessInformation: 'We supply authorized home and kitchen products to retailers.', whyWorkWithAuronix: 'We want to expand our authorized retail distribution.', sellerPolicyAgreement: true, contactAgreement: true };
process.env.SELLER_APPLICATION_OTP_SECRET = 'local-test-secret-at-least-24-characters';
async function verified(h) { const start = await h.call(draftRoute, { action: 'start', phone: form.phone }); assert.equal(start.status, 200); const auth = { draftId: start.body.draftId, resumeId: start.body.resumeId }; assert.equal((await h.call(draftRoute, { action: 'save', ...auth, form, step: 2 })).status, 200); assert.equal((await h.call(draftRoute, { action: 'email-request', ...auth, emailType: 'business', email: form.businessEmail })).status, 200); assert.equal((await h.call(draftRoute, { action: 'email-verify', ...auth, code: h.getCode() })).status, 200); return auth; }
test('draft, email, resume, submission and duplicate prevention need no phone verification', async () => { const h = harness(), auth = await verified(h); const resumed = await h.call(draftRoute, { action: 'resume', resumeId: auth.resumeId }); assert.equal(resumed.body.emailVerified, true); const result = await h.call(applyRoute, { ...auth, form }); assert.equal(result.status, 200); assert.equal(h.data.sellerApplications[result.body.applicationId].status, 'pending'); assert.equal(h.data.sellerApplicationDrafts[auth.draftId].status, 'submitted'); assert.equal((await h.call(applyRoute, { ...auth, form })).status, 403); assert.equal((await h.call(draftRoute, { action: 'resume', resumeId: auth.resumeId })).status, 404); assert.ok(!/whatsapp/i.test(JSON.stringify(h.data))); assert.ok(!h.accesses.some(p => /whatsapp/i.test(p))); });
test('invalid phone, incorrect code, unverified email, tampering and expired drafts remain blocked', async () => { const h = harness(); assert.equal((await h.call(draftRoute, { action: 'start', phone: '1' })).status, 400); const start = await h.call(draftRoute, { action: 'start', phone: form.phone }); const auth = { draftId: start.body.draftId, resumeId: start.body.resumeId }; assert.equal((await h.call(applyRoute, { ...auth, form })).status, 403); await h.call(draftRoute, { action: 'email-request', ...auth, email: form.businessEmail }); assert.equal((await h.call(draftRoute, { action: 'email-verify', ...auth, code: '000000' })).status, 400); assert.equal((await h.call(draftRoute, { action: 'save', ...auth, resumeId: 'AX-TAMPERED', form })).status, 401); await h.ref('sellerApplicationDrafts/' + auth.draftId).update({ expiresAt: 0 }); assert.equal((await h.call(draftRoute, { action: 'save', ...auth, form })).status, 401); });
test('legacy draft verification fields do not gate a valid email-verified submission', async () => { const h = harness(), auth = await verified(h); await h.ref('sellerApplicationDrafts/' + auth.draftId).update({ whatsappVerified: false, whatsappVerificationId: 'retired' }); assert.equal((await h.call(applyRoute, { ...auth, form })).status, 200); });
