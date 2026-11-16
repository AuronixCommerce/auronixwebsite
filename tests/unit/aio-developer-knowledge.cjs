const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('../helpers/route-harness.cjs');

test('developer topic and follow-ups use current site retrieval without turning unrelated questions into developer questions', () => {
  const h = harness();
  const { isDeveloperTopic } = h.load('lib/aio/developer-brand.ts');
  const { routeAioQuery } = h.load('lib/aio/router.ts');
  assert.equal(isDeveloperTopic('Tell me about AIO for developers'), true);
  assert.equal(isDeveloperTopic('How do I get an API key?'), true);
  assert.equal(isDeveloperTopic('What are the current AIO One and AIO 2 API input and output token prices?'), true);
  assert.equal(isDeveloperTopic('Pricing?', ['/aio/developers#models']), true);
  assert.equal(isDeveloperTopic('What is photosynthesis?'), false);
  assert.equal(routeAioQuery('What is AIO for developers?', [{role:'user',content:'What is AIO for developers?'}]).requiresRetrieval, true);
  const messages = [{role:'user',content:'Explain AIO for developers'}, {role:'assistant',content:'Here is the developer platform.'}, {role:'user',content:'And how much does it cost?'}];
  const follow = routeAioQuery(messages[2].content, messages);
  assert.equal(follow.requiresRetrieval, true);
  assert.match(follow.retrievalQuery, /AIO for developers/);
  assert.equal(routeAioQuery('What is photosynthesis?', [{role:'user',content:'What is photosynthesis?'}]).requiresRetrieval, false);
});
test('developer, Amazon and account guidance is retrievable while private admin records remain excluded', () => {
  const h = harness(), retrieval = h.load('lib/aio/retrieval.ts');
  const records = retrieval.getStaticAioKnowledge();
  assert.equal(records.some(r => r.route?.startsWith('/admin')), false);
  for (const route of ['/aio/developers','/aio/developers/console','/aio/developers/terms','/amazon-store','/aio/chat','/status','/notifications']) assert.ok(records.some(r => r.route === route), route);
  const developer = retrieval.retrieveAioKnowledge('AIO developer API access keys credits pricing', records, {intent:'auronix_information',limit:4});
  assert.ok(developer.some(r => r.record.route.startsWith('/aio/developers')));
  const amazon = records.find(r => r.route === '/amazon-store');
  assert.match(amazon.content, /amazon.com\/shops\/AuronixDirect/);
  assert.match(amazon.content, /separate from the affiliate/);
  assert.equal(amazon.lastUpdated, '2026-11-16');
  assert.doesNotMatch(records.find(r => r.route === '/marketplace-expertise').content, /Auronix does not directly sell/);
});
test('live developer knowledge formats public prices and pauses without including private account fields', () => {
  const h = harness(), { developerPricingKnowledge } = h.load('lib/aio/developer-knowledge.ts');
  const p = structuredClone(h.load('lib/developers/model.ts').DEFAULT_API_PRICING);
  p.enabled = false; p.rates['aio-2'] = {input:7000,output:15000};
  const record = developerPricingKnowledge(p);
  assert.match(record.content, /paused/);
  assert.match(record.content, /AIO 2: USD 7.00 per million input tokens; USD 15.00 per million output tokens/);
  assert.match(record.content, /4096.*8192/);
  assert.equal(record.visibility, 'public');
  assert.equal(record.route, '/aio/developers#models');
  assert.doesNotMatch(record.content, /aio_live_|whsec_|password|receipt-001/);
});
test('chat supplies current pricing to the model and skips stale canned answers for developer requests', async () => {
  const h = harness({settings:{ai:{enabled:true,aioEnabled:true,knowledgeEnabled:true,customerActionsEnabled:false},aioDeveloperApi:{pricingVersion:2,enabled:true,usdCentsPerCredit:100,requestsPerMinute:30,rates:{'aio-2':{input:7000,output:15000}}}}});
  let request, memoryCalls = 0;
  h.mocks['@/lib/ai-premade-memory'] = {findPremadeAnswer:()=>{memoryCalls++;return {answer:'Outdated launch price'};}};
  h.mocks['@/lib/server-maintenance-context'] = {getMaintenanceContext:async()=>null};
  h.mocks['@/lib/aio/observability'] = {writeAioLog:async()=>{}};
  h.mocks['@/lib/aio/provider'] = {
    isAioConfigured:()=>true, AioProviderError:class extends Error{},
    createAioProvider:()=>({name:'test',async *stream(r){request=r;yield {token:'Current API pricing is available.',info:{provider:'test',model:'test',usedFallback:false},finishReason:'stop'};}}),
  };
  const route = h.load('app/api/aio/chat/route.ts');
  const res = await route.POST(new Request('http://localhost/api/aio/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:'brand-knowledge-test',pathname:'/aio/chat',messages:[{role:'user',content:'What does AIO for developers cost?'}],preferences:{saveHistory:false}})}));
  assert.equal(res.status, 200);
  const events = await res.text();
  assert.ok(request, events);
  assert.equal(memoryCalls, 0);
  assert.match(request.messages[0].content, /AIO 2: USD 7.00 per million input tokens; USD 15.00 per million output tokens/);
  assert.match(events, /live:aio-developer-pricing/);
  h.data.settings.aioDeveloperApi.rates['aio-2'].input = 9000;
  const refreshed = await route.POST(new Request('http://localhost/api/aio/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:'brand-knowledge-refresh',messages:[{role:'user',content:'What are the current AIO One and AIO 2 API input and output token prices?'}],preferences:{saveHistory:false}})}));
  await refreshed.text();
  assert.match(request.messages[0].content, /AIO 2: USD 9.00 per million input tokens/);
  assert.equal(h.accesses.some(p => /^aioDeveloper(?:Billing|Accounts|Keys|Invoices)/.test(p)), false);
});
test('the shopping shortcut distinguishes the AuronixDirect seller store from affiliate discovery', () => {
  const h = harness(), { findPremadeAnswer } = h.load('lib/ai-premade-memory.ts');
  const result = findPremadeAnswer('Where can I shop Auronix products?');
  assert.match(result.answer, /AuronixDirect/);
  assert.match(result.answer, /\/amazon-store/);
  assert.match(result.answer, /separate.*affiliate/);
  assert.doesNotMatch(result.answer, /Auronix does not sell/);
});
test('activity retains every consulted page and uses logos for each developer source', () => {
  const h = harness(), {sourceActivityItems} = h.load('lib/aio/source-activity.ts');
  const sources = Array.from({length:8},(_,i)=>({id:`source-${i}`,title:i<2?'AIO for developers':'Supplier guide '+i,route:i<2?'/aio/developers/'+i:'/help/'+i}));
  const items = sourceActivityItems([...sources,sources[0]]);
  assert.equal(items.length,8);
  assert.equal(items.filter(i=>i.developer).length,2);
});
test('reply retrieval always checks the two base pages and includes more than four relevant pages without unrelated priority-only results', () => {
  const h=harness(), {retrieveAioKnowledge}=h.load('lib/aio/retrieval.ts');
  const records=[{id:'home',title:'Home',route:'/',content:'Auronix commerce',visibility:'public'}, {id:'dev',title:'AIO for developers',route:'/aio/developers',content:'Developer platform',visibility:'public'}, ...Array.from({length:8},(_,i)=>({id:'guide'+i,title:'Supplier guide '+i,route:'/guide/'+i,content:'Supplier documents and applications',visibility:'public'})),{id:'unrelated',title:'Space',content:'Galaxies and stars',visibility:'public',priority:8},{id:'private',title:'Supplier secrets',route:'/admin',content:'Supplier private records',visibility:'admin'}];
  const result=retrieveAioKnowledge('Supplier documents',records,{intent:'supplier',allRelevant:true,requiredRoutes:['/','/aio/developers']});
  assert.equal(result.length,10);
  assert.deepEqual(result.slice(0,2).map(r=>r.record.id),['home','dev']);
  assert.ok(!result.some(r=>r.record.id==='private'||r.record.id==='unrelated'));
  const general=retrieveAioKnowledge('photosynthesis',records,{intent:'general_question',allRelevant:true,requiredRoutes:['/','/aio/developers']});
  assert.deepEqual(general.map(r=>r.record.id),['home','dev']);
});
test('informational supplier overviews stay in chat while explicit application requests open the action', () => {
  const h=harness(), {suggestCustomerAction}=h.load('lib/aio/customer-actions.ts');
  assert.equal(suggestCustomerAction('Give me a short overview of AIO for developers pricing, supplier document checklists, application tracking, video guides and the Amazon store.'),null);
  assert.equal(suggestCustomerAction('I want to apply as a supplier'),'supplier_apply');
  assert.equal(suggestCustomerAction('Explain the process and sign me up as a supplier'),'supplier_apply');
});
