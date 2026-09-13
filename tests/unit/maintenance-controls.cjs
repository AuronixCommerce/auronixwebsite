const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function harness(initial = {}) {
  const data = structuredClone(initial);
  let authorized = true;
  const read = p => p.split('/').filter(Boolean).reduce((v,k) => v?.[k], data);
  const write = (p,v) => { const parts=p.split('/').filter(Boolean),key=parts.pop();let obj=data;for(const part of parts)obj=obj[part]??={}; if(v===null)delete obj[key];else obj[key]=structuredClone(v); };
  const ref = p => ({ get: async()=>({exists:()=>read(p)!=null,val:()=>structuredClone(read(p))}),set:async v=>write(p,v),update:async updates=>{for(const [key,value] of Object.entries(updates))write(p+'/'+key,value);} });
  const cache={};
  function load(file, overrides={}) {
    const key=file+Object.keys(overrides).join();if(cache[key])return cache[key];
    const mod={exports:{}};
    const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const local=id=>{if(overrides[id])return overrides[id];if(id==='@/lib/firebase-admin')return {adminDb:{ref}};if(id==='@/lib/server-auth')return {requireAdmin:async()=>{if(!authorized)throw Error('Admin access required');}};if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load(['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(path.join(root,p))),overrides);}return require(id);};
    new Function('require','module','exports',code)(local,mod,mod.exports);return cache[key]=mod.exports;
  }
  async function call(file,method,body,url='http://localhost/api/test?path=/seller/apply') {const res=await load(file)[method](new Request(url,{method,...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})}));return {status:res.status,headers:res.headers,body:await res.json()};}
  return {data,load,call,setAuthorized:v=>{authorized=v;}};
}
const admin='app/api/admin/page-controls/route.ts',status='app/api/maintenance/status/route.ts',publicApi='app/api/page-controls/route.ts';
test('seller ON/OFF is consistent across admin, page controls and maintenance status',async()=>{
  const h=harness();
  for(const enabled of [true,false,true,false]){
    assert.equal((await h.call(admin,'POST',{action:'page',path:'/seller/apply/',maintenanceEnabled:enabled})).status,200);
    const state=await h.call(status,'GET');const controls=await h.call(publicApi,'GET');
    assert.equal(state.body.page.active,enabled);assert.equal(controls.body.page.maintenanceEnabled,enabled);
    assert.match(state.headers.get('cache-control'),/no-store/);
    assert.equal((await h.call(admin,'GET')).body.pages['/seller/apply'].maintenanceEnabled,enabled);
  }
});
test('false strings and stale aliases cannot enable a seller page',async()=>{
 const h=harness({sitePageControls:{global:{maintenanceEnabled:'false',scheduleEnabled:'false'},pages:{legacy:{path:'/seller/apply/',maintenanceEnabled:true,updatedAt:100},seller__apply:{path:'/seller/apply',maintenanceEnabled:false,updatedAt:50},seller__login:{maintenanceEnabled:'false',scheduleEnabled:'false'}}}});
 for(const route of ['/seller/apply','/seller/login']){const r=await h.call(status,'GET',null,'http://localhost/api/test?path='+route);assert.equal(r.body.global.active,false);assert.equal(r.body.page.active,false);}
 assert.equal((await h.call(admin,'GET')).body.pages['/seller/apply'].maintenanceEnabled,false);
});
test('manual maintenance survives an expired schedule; schedules agree between APIs',async()=>{
 const h=harness();const now=Date.now();
 await h.call(admin,'POST',{action:'page',path:'/seller/apply',maintenanceEnabled:true,scheduleEnabled:true,scheduleStartAt:now-2000,scheduleEndAt:now-1000});
 assert.equal((await h.call(status,'GET')).body.page.active,true);
 assert.equal((await h.call(publicApi,'GET')).body.page.maintenanceEnabled,true);
 await h.call(admin,'POST',{action:'page',path:'/seller/apply',maintenanceEnabled:false,scheduleStartAt:now-1000,scheduleEndAt:now+60000});
 assert.equal((await h.call(status,'GET')).body.page.active,true);
 assert.equal((await h.call(publicApi,'GET')).body.page.schedule.active,true);
 await h.call(admin,'POST',{action:'disable-all'});
 assert.equal((await h.call(status,'GET')).body.page.active,false);
});
test('AI settings persist, partial updates preserve other settings, and admin/API routes bypass maintenance',async()=>{
 const h=harness();await h.call(admin,'POST',{action:'global',maintenanceEnabled:true,aiMaintenanceEnabled:true,aiMaintenanceMessage:'Test maintenance'});
 await h.call(admin,'POST',{action:'global',aiMaintenanceEnabled:false});
 assert.equal((await h.call(admin,'GET')).body.global.maintenanceEnabled,true);
 assert.equal((await h.call(admin,'GET')).body.global.aiMaintenanceEnabled,false);
 for(const route of ['/admin','/admin/login','/api/seller/draft']){const r=await h.call(status,'GET',null,'http://localhost/api/test?path='+route);assert.equal(r.body.bypass,true);assert.equal(r.body.global.active,false);}
 h.setAuthorized(false);assert.notEqual((await h.call(admin,'POST',{action:'disable-all'})).status,200);
});
test('persistent root layout refreshes on maintenance OFF and ON, and ignores failed status checks',async()=>{
 const h=harness();let effect,refreshes=0,cleanup;let reply={success:true,global:{active:false},page:{active:false}};
 const original={window:global.window,document:global.document,fetch:global.fetch};
 global.window={setInterval:()=>1,clearInterval:()=>{},addEventListener:()=>{},removeEventListener:()=>{}};
 global.document={visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}};
 global.fetch=async()=>({ok:reply.success,json:async()=>reply});
 try{
  const {MaintenanceRefresh}=h.load('components/site/maintenance-refresh.tsx',{'react':{useEffect:fn=>{effect=fn;}},'next/navigation':{usePathname:()=>'/seller/apply',useRouter:()=>({refresh:()=>refreshes++})}});
  MaintenanceRefresh({serverPath:'/seller/apply',blocked:true});cleanup=effect();await new Promise(setImmediate);assert.equal(refreshes,1);cleanup();
  reply={success:true,global:{active:true},page:{active:false}};
  MaintenanceRefresh({serverPath:'/seller/apply',blocked:false});cleanup=effect();await new Promise(setImmediate);assert.equal(refreshes,2);cleanup();
  reply={success:false};MaintenanceRefresh({serverPath:'/seller/apply',blocked:true});cleanup=effect();await new Promise(setImmediate);assert.equal(refreshes,2);cleanup();
 }finally{Object.assign(global,original);}
});
