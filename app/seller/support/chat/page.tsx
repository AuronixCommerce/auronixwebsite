import { SellerLayout } from '@/components/seller/seller-layout';
import { SupportWorkspace } from '@/components/support/support-workspace';
export const metadata={title:'Seller Support Chat',robots:{index:false,follow:false}};
export default function SellerChatPage(){return <SellerLayout><SupportWorkspace seller/></SellerLayout>;}
