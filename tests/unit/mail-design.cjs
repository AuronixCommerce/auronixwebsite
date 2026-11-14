const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');

function mailHarness(){
  const sent=[],jobs=new Map(),cache=new Map();
  const mocks={
    nodemailer:{createTransport:()=>({sendMail:async value=>{sent.push(value);return {accepted:[value.to],messageId:'test'};}})},
    '@/lib/firebase-admin':{adminDb:{}},
    '@/lib/aio/customer-session-cleanup':{cleanupCustomerActionSessions:async()=>{}},
    '@/lib/mail-queue':{
      enqueueMail:async mail=>{const id=String(jobs.size+1);jobs.set(id,mail);return id;},
      processMailJob:async(id,deliver)=>deliver(jobs.get(id),id),drainMailQueue:async()=>({}),
    },
  };
  function load(name){
    if(Object.hasOwn(mocks,name))return mocks[name];
    const file=name.startsWith('@/')?path.join(root,name.slice(2)+'.ts'):name;
    if(!file.endsWith('.ts'))return require(name);
    if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    new Function('require','module','exports',source)((dep)=>load(dep.startsWith('.')?path.resolve(path.dirname(file),dep)+'.ts':dep),mod,mod.exports);
    return mod.exports;
  }
  return {sent,load};
}
process.env.SMTP_PASSWORD='test-only-not-a-real-password';
process.env.SMTP_USER='business@example.test';

test('every application email path includes the original embedded O and company identity while preserving attachments',async()=>{
  const h=mailHarness(),mail=h.load('@/lib/server-mail');
  const base={email:'recipient@example.test',name:'Taylor <script>',code:'123456',expiresAt:Date.now()+600000};
  await mail.sendSellerInvitationEmail({...base,invitationUrl:'https://auronixcommerce.com/seller/activate?token=test'});
  await mail.sendPasswordResetEmail({...base,resetUrl:'https://auronixcommerce.com/reset-password?oobCode=test'});
  await mail.sendSellerEmailVerification(base);
  await mail.sendSellerResumeIdEmail({...base,resumeId:'AX-RESUME-123'});
  await mail.sendNewsletterUnsubscribeEmail({...base,unsubscribeUrl:'https://auronixcommerce.com/newsletter/unsubscribe?token=test'});
  await mail.sendNewsletterOptInEmail({...base,confirmationUrl:'https://auronixcommerce.com/newsletter/confirm?token=test'});
  await mail.sendAdminMfaCodeEmail({...base,device:'Chrome <untrusted>'});
  await mail.sendTicketResponseEmail({...base,message:'Your <account> update.'});
  await mail.sendProfessionalEmail({to:base.email,subject:'Auronix transcript',htmlBody:'<h1>Conversation</h1><p><strong>Bold answer</strong></p>',attachments:[{filename:'transcript.pdf',content:Buffer.from('%PDF-test')}]});
  await mail.sendProfessionalEmail({to:base.email,subject:'Admin authored message',html:'<!doctype html><html><head><style>.note{font-weight:700}</style></head><body><p class="note">Admin content</p></body></html>'});
  await mail.sendBusinessMail({to:base.email,subject:'Legacy direct email',html:'<p>Legacy body</p>'});
  for(const message of h.sent){
    assert.match(message.html,/data-auronix-email="v2"/);
    assert.match(message.html,/cid:auronix-brand-o/);
    assert.match(message.html,/AURONIX/);assert.match(message.html,/COMMERCE LLC/);
    assert.equal((message.html.match(/<!doctype html>/gi)||[]).length,1);
    const marks=message.attachments.filter(a=>a.cid==='auronix-brand-o');assert.equal(marks.length,1);
    assert.equal(marks[0].content.subarray(1,4).toString(),'PNG');
    assert.doesNotMatch(message.html,/<script>|<untrusted>/);
  }
  const transcript=h.sent.find(m=>m.subject==='Auronix transcript');
  assert.equal(transcript.attachments.find(a=>a.filename==='transcript.pdf').content.toString(),'%PDF-test');
  assert.match(transcript.html,/<strong>Bold answer<\/strong>/);
  const authored=h.sent.find(m=>m.subject==='Admin authored message');assert.match(authored.html,/\.note\{font-weight:700\}/);assert.match(authored.html,/Admin content/);
});

test('AIO, tracking and workspace verification messages use readable code cards without changing code instructions',async()=>{
  const h=mailHarness(),mail=h.load('@/lib/server-mail');
  for(const prefix of ['Auronix','AIO transcript','application tracking','workspace']){
    await mail.sendProfessionalEmail({to:'recipient@example.test',subject:'Email verification',body:`Your ${prefix} verification code is 654321.\n\nAction: track an application. Expires in 10 minutes. Never share it.`});
    const message=h.sent.at(-1);assert.match(message.html,/class="email-code"/);assert.match(message.html,/>654321<\/div>/);assert.match(message.html,/track an application/);assert.match(message.html,/Expires in 10 minutes/);assert.match(message.text,/654321/);
  }
});

test('newsletter personalization, opt-out links and brand attachment survive the shared design',async()=>{
  const h=mailHarness(),newsletter=h.load('@/lib/server-newsletter');
  await newsletter.sendNewsletterEmail({email:'recipient@example.test',name:'Taylor <unsafe>',unsubscribeToken:'private-token'},'The Auronix journal','<h1>Monthly update</h1><p>Hello {{name}}</p>','Monthly update');
  const email=h.sent[0];assert.match(email.html,/AURONIX JOURNAL/);assert.match(email.html,/Taylor &lt;unsafe&gt;/);assert.match(email.html,/newsletter\/unsubscribe\?token=private-token/);assert.match(email.html,/newsletter\/preferences\?token=private-token/);assert.match(email.text,/Unsubscribe:/);assert.equal(email.attachments[0].cid,'auronix-brand-o');
});

test('branding is idempotent and untrusted message text stays escaped',()=>{
  const {load}=mailHarness(),design=load('@/lib/email/design');
  const html=design.emailShell({title:'Security <test>',preheader:'Hello <test>',body:design.professionalEmailBody('<img src=x onerror=alert(1)>\n\nhttps://example.test/?a=1&b=2','Update','<b>Name</b>')});
  assert.equal(design.ensureBrandedEmail(html,'Repeated'),html);
  assert.doesNotMatch(html,/<img src=x|<b>Name/);assert.match(html,/&lt;img src=x/);assert.match(html,/href="https:\/\/example.test\/\?a=1&amp;b=2"/);
});
