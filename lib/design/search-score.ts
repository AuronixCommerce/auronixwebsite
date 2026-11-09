const aliases:Record<string,string>={affliate:'affiliate',affiliates:'affiliate',products:'shop',product:'shop',catalog:'shop',catalogue:'shop',login:'sign in',signin:'sign in',wholesale:'supplier',suppliers:'supplier',application:'application',tracking:'track'};
export function normalizeSearch(value:string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean).map(v=>aliases[v]||v).join(' ');
}
export function fuzzyScore(text:string,query:string) {
  const t=normalizeSearch(text),q=normalizeSearch(query); if(!q)return 1;
  if(t===q)return 12;if(t.startsWith(q))return 8;if(t.includes(q))return 6;
  const words=t.split(/\s+/),terms=q.split(/\s+/);
  if(terms.every(term=>words.some(w=>w.startsWith(term))))return 4;
  // Allow one missing, extra, or changed letter in words of at least four letters.
  const near=(a:string,b:string)=>{if(a===b)return true;if(a.length<4||b.length<4||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(a.length-i)+(b.length-j)<=1;};
  return terms.every(term=>words.some(w=>near(w,term)))?2:0;
}
