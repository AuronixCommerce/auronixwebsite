import type { AioModelId } from './models';
import type { AioStreamEvent } from './types';
function pause(ms:number,signal:AbortSignal):Promise<void> {
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}
    const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(new DOMException('Aborted','AbortError'));};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},ms);
    signal.addEventListener('abort',cancel,{once:true});
  });
}
/** Pace only the classic mode's visible text, without delaying provider work on the server. */
export async function* paceAioEvents(events:AsyncIterable<AioStreamEvent>,model:AioModelId,signal:AbortSignal,wait=pause):AsyncGenerator<AioStreamEvent> {
  for await(const event of events){
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    if(model!=='aio-one'||event.type!=='token'||!event.token){yield event;continue;}
    const characters=Array.from(event.token);
    for(let i=0;i<characters.length;i+=24){
      await wait(45,signal);
      if(signal.aborted)throw new DOMException('Aborted','AbortError');
      yield {...event,token:characters.slice(i,i+24).join('')};
    }
  }
}
