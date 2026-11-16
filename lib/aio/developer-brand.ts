/** Product-topic detection shared by routing and the trusted chat brand card. */
export function isDeveloperTopic(text: string, routes: string[] = []) {
  return routes.some(route => /^\/aio\/developers(?:[/?#]|$)/.test(route)) ||
    (/\baio\s*(?:one|2(?:\s+fast)?)\b/i.test(text) && /\b(?:api|tokens?|pricing|prices?|cost|billing|credits?|sdk)\b/i.test(text)) ||
    /\/aio\/developers(?:[/?#]|$)|\baio\s+(?:for\s+)?developers?\b|\baio\s+api\b|\bdeveloper\s+(?:platform|console|account|access|api)\b|\bapi\s+(?:keys?|credits?|pricing|billing|access|tokens?|usage|integration)\b|\b(?:sdks?|webhooks?)\b/i.test(text);
}
