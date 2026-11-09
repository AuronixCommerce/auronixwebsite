import { AioChatWorkspace } from '@/components/site/aio-chat-workspace';
import { buildSeo } from '@/lib/seo';
export const metadata=buildSeo({title:'Chat with AIO',description:'A dedicated workspace for AIO One, AIO 2 and AIO 2 Fast. Get answers, manage reply preferences, and save your conversation.',path:'/aio/chat'});
export default function AioChatPage(){return <AioChatWorkspace/>;}
