import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
const secret=process.env.AIO_WEBHOOK_SECRET||'';
if(!secret.startsWith('whsec_'))throw Error('Set your private webhook signing secret in .env.');
// Demonstration only: replace this cache with durable event-ID storage for production.
const seen=new Map();
createServer((req,res)=>{
 if(req.method!=='POST'||req.url!=='/aio-webhook'){res.writeHead(404).end();return;}
 let chunks=[],bytes=0;
 req.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){res.writeHead(413).end();req.destroy();return;}chunks.push(chunk);});
 req.on('end',()=>{
  const raw=Buffer.concat(chunks),timestamp=String(req.headers['aio-webhook-timestamp']||''),eventId=String(req.headers['aio-webhook-id']||''),signature=String(req.headers['aio-webhook-signature']||'');
  if(!/^\d{10,12}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!/^v1=[a-f0-9]{64}$/.test(signature)){res.writeHead(401).end();return;}
  const expected='v1='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
  if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected))){res.writeHead(401).end();return;}
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{res.writeHead(400).end();return;}
  if(!eventId||event.id!==eventId){res.writeHead(400).end();return;}
  for(const[id,at]of seen)if(at<Date.now()-86400000)seen.delete(id);
  if(!seen.has(eventId)){seen.set(eventId,Date.now());console.log('Verified AIO event:',event.type,event.id,event.data);/* Enqueue your durable, idempotent business handler here. */}
  res.writeHead(200,{'Content-Type':'application/json'}).end('{"received":true}');
 });
}).listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Local webhook receiver ready. Expose /aio-webhook through your own public HTTPS server/reverse proxy.'));
