import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { marketplaceProviders, providerById } from '@/lib/server-marketplaces';
import { cleanText, sellerContext } from '@/lib/server-seller-os';
import { userFacingError } from '@/lib/user-facing-error';

export const dynamic='force-dynamic';

export async function GET(request:Request){
  try{
    const{uid}=await sellerContext(request);const snapshot=await adminDb.ref(`sellerMarketplaceConnections/${uid}`).get();const stored=snapshot.exists()?snapshot.val()||{}:{};
    const connections=marketplaceProviders().map(provider=>{const value=stored[provider.id]||{};const connected=value.status==='connected'&&Boolean(value.connectedAt);return{id:provider.id,name:provider.name,configured:provider.configured,oauthConfigured:provider.oauthConfigured,status:connected?'connected':value.status==='requires-attention'?'requires-attention':value.status==='error'?'error':'disconnected',connectedAt:connected?value.connectedAt:undefined,lastSyncAt:connected?value.lastSyncAt:undefined,error:value.status==='error'?cleanText(value.error,500):undefined,capabilities:provider.capabilities};});
    return NextResponse.json({connections},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return NextResponse.json({error:userFacingError(error,'Unable to load marketplace connections.')},{status:401});}
}

export async function POST(request:Request){
  try{
    const{uid}=await sellerContext(request);const body=await request.json();const marketplace=cleanText(body.marketplace,40).toLowerCase();const action=cleanText(body.action,30).toLowerCase();const provider=providerById(marketplace);
    if(!provider)return NextResponse.json({error:'Unsupported marketplace.'},{status:400});
    const ref=adminDb.ref(`sellerMarketplaceConnections/${uid}/${provider.id}`);
    if(action==='disconnect'){await ref.remove();return NextResponse.json({success:true,status:'disconnected'});}
    if(action==='connect'){
      if(!provider.configured)return NextResponse.json({error:`${provider.name} integration credentials are not configured on the Auronix backend.`,code:'MARKETPLACE_NOT_CONFIGURED'},{status:409});
      if(!provider.oauthConfigured)return NextResponse.json({error:`${provider.name} OAuth redirect configuration is incomplete.`,code:'MARKETPLACE_OAUTH_NOT_CONFIGURED'},{status:409});
      return NextResponse.json({error:`${provider.name} connection must be completed through the provider authorization flow. No marketplace account has been connected yet.`,code:'MARKETPLACE_AUTH_REQUIRED'},{status:409});
    }
    return NextResponse.json({error:'Unsupported marketplace action.'},{status:400});
  }catch(error){return NextResponse.json({error:userFacingError(error,'Unable to update marketplace connection.')},{status:400});}
}
