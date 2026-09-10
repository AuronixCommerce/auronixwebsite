import { SiteLayout } from '@/components/site/site-layout';
import { SupportWorkspace } from '@/components/support/support-workspace';
import { buildSeo } from '@/lib/seo';
export const metadata=buildSeo({title:'Support Chat',description:'Get guidance on Auronix Commerce suppliers, sellers and support in a dedicated conversation.',path:'/support/chat'});
export default function SupportChatPage(){return <SiteLayout><div className="ac-support-page ac-support-standalone"><SupportWorkspace/></div></SiteLayout>;}
