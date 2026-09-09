import { SiteLayout } from '@/components/site/site-layout';
import { TeamConversation } from '@/components/support/team-conversation';
import { buildSeo } from '@/lib/seo';
export const metadata=buildSeo({title:'Contact Support',description:'Start a dedicated support conversation with Auronix Commerce.',path:'/support/contact'});
export default function ContactSupportPage(){return <SiteLayout><div className="ac-support-page"><TeamConversation/></div></SiteLayout>;}
