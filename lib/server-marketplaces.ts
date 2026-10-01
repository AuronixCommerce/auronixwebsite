export type MarketplaceProviderId='amazon'|'walmart'|'ebay';
export type MarketplaceProvider={id:MarketplaceProviderId;name:string;configured:boolean;oauthConfigured:boolean;capabilities:string[]};

export function marketplaceProviders():MarketplaceProvider[]{
  return [
    {id:'amazon',name:'Amazon',configured:Boolean(process.env.AMAZON_SP_API_CLIENT_ID&&process.env.AMAZON_SP_API_CLIENT_SECRET),oauthConfigured:Boolean(process.env.AMAZON_SP_API_CLIENT_ID&&process.env.AMAZON_SP_API_CLIENT_SECRET&&process.env.AMAZON_SP_API_REDIRECT_URI),capabilities:['listings','orders','inventory','account-health']},
    {id:'walmart',name:'Walmart',configured:Boolean(process.env.WALMART_CLIENT_ID&&process.env.WALMART_CLIENT_SECRET),oauthConfigured:Boolean(process.env.WALMART_CLIENT_ID&&process.env.WALMART_CLIENT_SECRET&&process.env.WALMART_REDIRECT_URI),capabilities:['listings','orders','inventory']},
    {id:'ebay',name:'eBay',configured:Boolean(process.env.EBAY_CLIENT_ID&&process.env.EBAY_CLIENT_SECRET),oauthConfigured:Boolean(process.env.EBAY_CLIENT_ID&&process.env.EBAY_CLIENT_SECRET&&process.env.EBAY_REDIRECT_URI),capabilities:['listings','orders','inventory']},
  ];
}

export function providerById(id:string){return marketplaceProviders().find(provider=>provider.id===id);}
