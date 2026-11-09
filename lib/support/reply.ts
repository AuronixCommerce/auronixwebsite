import { readAioStream } from '../aio/stream';
/** Buffer the response so support displays one complete message after its typing state. */
export async function collectSupportReply(stream:ReadableStream<Uint8Array>,signal:AbortSignal) {
  let text='',source:'found'|'online'='online',complete=false;
  for await(const event of readAioStream(stream)) {
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    if(event.type==='error')throw new Error(event.message);
    if(event.type==='token')text+=event.token;
    if(event.type==='message_complete'){
      complete=true;source=event.answerSource==='premade'?'found':'online';
      if(event.truncated)text+='\n\nThis reply reached its length limit. Ask me to continue if you need more detail.';
      break;
    }
  }
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(!complete)throw new Error('The reply was interrupted. Please try again.');
  if(!text.trim())throw new Error('The support service returned an empty reply. Please retry.');
  return {answer:text.trim(),answerSource:source};
}
