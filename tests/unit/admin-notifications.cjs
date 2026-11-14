const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('../helpers/route-harness.cjs');
const route='app/api/admin/notifications/route.ts';
const initial=()=>({users:{'test-admin':{role:'admin'},other:{role:'admin'}},suppliers:{supplier1:{companyName:'Supplier One',status:'new',createdAt:100,documents:{doc1:{name:'Authorization.pdf',status:'pending',uploadedAt:300}}}},sellerApplications:{seller1:{fullName:'Taylor',status:'pending',createdAt:200}},tickets:{ticket1:{subject:'Need help',email:'customer@example.test',createdAt:400,lastCustomerReplyAt:500}},contactMessages:{contact1:{name:'Visitor',message:'Hello team',createdAt:600}},aioDeveloperInvoiceQueue:{invoice1:{uid:'dev1',credits:50,status:'payment_submitted',createdAt:700}}});
test('admin inbox combines recent source records and links exact records without leaking access to non-admins',async()=>{
 const h=harness(initial()),r=h.load(route);let response=await r.GET(new Request('http://test/api/admin/notifications'));const d=await response.json();assert.equal(response.status,200);assert.equal(d.items.length,7);assert.equal(d.items[0].category,'Payments');assert.match(d.items[0].href,/uid=dev1/);assert.match(d.items[0].href,/invoice=invoice1/);assert.ok(d.items.some(i=>i.title.includes('Authorization.pdf')));assert.ok(d.items.some(i=>i.category==='Messages'));assert.ok(d.items.some(i=>i.title.includes('New customer reply')));assert.equal(d.unread,7);assert.match(response.headers.get('Cache-Control'),/no-store/);
 h.setAdmin(false);response=await r.GET(new Request('http://test'));assert.equal(response.status,401);assert.doesNotMatch(await response.text(),/Supplier One|customer@example/);
});
test('opening and completing tasks persists per admin, allows reopening and never changes the source decision',async()=>{
 const h=harness(initial()),feed=h.load('lib/admin/notifications.ts');let d=await feed.adminNotifications('test-admin');const id=d.items.find(i=>i.category==='Applications').id;
 assert.equal((await h.call(route,{id,action:'read'})).status,200);d=await feed.adminNotifications('test-admin');assert.equal(d.items.find(i=>i.id===id).readAt>0,true);assert.equal(d.unread,6);
 assert.equal((await h.call(route,{id,action:'done'})).status,200);d=await feed.adminNotifications('test-admin');assert.equal(d.items.find(i=>i.id===id).doneAt>0,true);assert.equal(h.data.sellerApplications.seller1.status,'pending');assert.equal((await feed.adminNotifications('other')).items.find(i=>i.id===id).doneAt,0);
 delete h.data.sellerApplications.seller1;d=await feed.adminNotifications('test-admin');assert.equal(d.items.find(i=>i.id===id).doneAt>0,true);assert.equal(d.items.find(i=>i.id===id).title,'Applications task');
 assert.equal((await h.call(route,{id,action:'undo'})).status,200);d=await feed.adminNotifications('test-admin');assert.equal(d.items.find(i=>i.id===id).doneAt,0);
 assert.equal((await h.call(route,{id:'../other',action:'done'})).status,400);assert.equal((await h.call(route,{id:'a'.repeat(64),action:'done'})).status,404);
});
test('new customer replies remain actionable after the preceding reply notification is done',async()=>{
 const h=harness(initial()),feed=h.load('lib/admin/notifications.ts');const previous=(await feed.adminNotifications('test-admin')).items.find(i=>i.title.includes('New customer reply'));await h.call(route,{id:previous.id,action:'done'});h.data.tickets.ticket1.lastCustomerReplyAt=800;const d=await feed.adminNotifications('test-admin');const fresh=d.items.find(i=>i.title.includes('New customer reply'));assert.notEqual(fresh.id,previous.id);assert.equal(fresh.doneAt,0);assert.equal(fresh.readAt,0);assert.ok(d.items.find(i=>i.id===previous.id).doneAt);
});

test('a failed notification source is reported without hiding other recent submissions',async()=>{
 const h=harness(initial()),original=h.mocks['@/lib/firebase-admin'].adminDb.ref;
 h.mocks['@/lib/firebase-admin'].adminDb.ref=path=>{if(path==='websiteFeedback')throw Error('Test source unavailable');return original(path);};
 const r=await h.load(route).GET(new Request('http://test'));assert.equal(r.status,200);const d=await r.json();assert.deepEqual(d.unavailable,['Feedback']);assert.ok(d.items.some(i=>i.category==='Applications'));
});
