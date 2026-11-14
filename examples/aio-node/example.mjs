import { randomUUID } from 'node:crypto';
const key=process.env.AIO_API_KEY||'';
if(!key.startsWith('aio_live_'))throw Error('Set AIO_API_KEY in your private .env file first.');
const idempotencyKey=randomUUID();
console.log('Request idempotency key:',idempotencyKey);
try{
 const response=await fetch(`${process.env.AIO_BASE_URL||'https://auronixcommerce.com/api/aio/v1'}/chat/completions`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({model:process.env.AIO_MODEL||'aio-2-fast',messages:[{role:'user',content:process.argv.slice(2).join(' ')||'Explain wholesale sourcing in two sentences.'}],max_completion_tokens:512}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok)throw Error(`HTTP ${response.status}: ${result.error?.message||'Request failed'}`);
 console.log(result.choices[0].message.content);console.log('Tokens:',result.usage);console.log('Credits charged:',result.billing.charged_units/result.billing.units_per_credit);console.log('Request ID:',result.id);
}catch(error){console.error(error.message);console.error('After a timeout, check console Usage before submitting a new request. Do not automatically retry with a new idempotency key.');process.exitCode=1;}
