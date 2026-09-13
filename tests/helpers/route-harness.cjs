const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function harness(initial = {}) {
  const data = structuredClone(initial), accesses = [], mails = [];
  let sequence = 0, code = '', admin = true, mailFailure = false;
  const read = p => p.split('/').filter(Boolean).reduce((v, k) => v?.[k], data);
  const write = (p, v) => { const parts = p.split('/').filter(Boolean), key = parts.pop(); let obj = data; for (const part of parts) obj = obj[part] ??= {}; if (v === null) delete obj[key]; else obj[key] = structuredClone(v); };
  const snap = p => ({ exists: () => read(p) != null, val: () => structuredClone(read(p) ?? null) });
  function ref(p) {
    accesses.push(p);
    return {
      key: p.split('/').pop(), get: async () => snap(p), set: async v => write(p, v),
      update: async v => { for (const [key, value] of Object.entries(v)) write(p + '/' + key, value); },
      remove: async () => write(p, null), push: () => ref(p + '/test-' + (++sequence)),
      transaction: async fn => { const value = fn(structuredClone(read(p) ?? null)); if (value !== undefined) write(p, value); return { committed: value !== undefined, snapshot: snap(p) }; },
      orderByChild: field => ({ equalTo: value => ({ limitToFirst: count => ({ get: async () => { const found = Object.fromEntries(Object.entries(read(p) || {}).filter(([,v]) => v[field] === value).slice(0, count)); return { exists: () => Object.keys(found).length > 0, val: () => found }; } }) }) }),
    };
  }
  const mocks = {
    '@/lib/firebase-admin': { adminDb: { ref }, adminAuth: { getUserByEmail: async () => { throw Object.assign(new Error('No account'), { code: 'auth/user-not-found' }); } } },
    '@/lib/server-auth': { requireAdmin: async () => { if (!admin) throw Error('Admin access required'); return { uid: 'test-admin' }; } },
    '@/lib/server-seller-invitations': { normalizeEmail: v => String(v || '').trim().toLowerCase() },
    '@/lib/server-protection': { protectPublicRequest: async () => {}, publicRequestErrorResponse: () => null },
    '@/lib/server-mail': { sendSellerEmailVerification: async value => { code = value.code; }, sendSellerResumeIdEmail: async () => {}, sendProfessionalEmail: async value => { if (mailFailure) throw Error('Test mail unavailable'); mails.push(value); } },
  };
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const mod = { exports: {} };
    const local = id => {
      if (mocks[id]) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) return load((id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id)) + '.ts');
      return require(id);
    };
    new Function('require', 'module', 'exports', output)(local, mod, mod.exports);
    return cache[file] = mod.exports;
  }
  const call = async (file, body) => { const response = await load(file).POST(new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: response.status, body: await response.json() }; };
  return { data, accesses, mails, ref, call, load, getCode: () => code, setAdmin: value => { admin = value; }, failMail: value => { mailFailure = value; } };
}
module.exports = { harness };
