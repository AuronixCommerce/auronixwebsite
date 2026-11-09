import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
export type DocNode={type:string;value?:string;url?:string;alt?:string;depth?:number;ordered?:boolean;start?:number;children?:DocNode[]};
export const parseMarkdown=(text:string)=>unified().use(remarkParse).use(remarkGfm).parse(text) as DocNode;
export const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function safeDocumentUrl(value:string){try{const url=new URL(value,'https://auronixcommerce.com');return ['https:','http:','mailto:'].includes(url.protocol)?url.toString():null;}catch{return null;}}
export function markdownEmailHtml(text:string):string {
 const render=(n:DocNode):string=>{
  const children=()=>n.children?.map(render).join('')||'';
  switch(n.type){
   case 'root':return children();case 'text':return escapeHtml(n.value||'').replace(/\n/g,'<br>');
   case 'strong':return `<strong style="font-weight:700;color:#111827">${children()}</strong>`;
   case 'emphasis':return `<em>${children()}</em>`;case 'delete':return `<del>${children()}</del>`;
   case 'inlineCode':return `<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px">${escapeHtml(n.value||'')}</code>`;
   case 'code':return `<pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;padding:12px;border-radius:8px">${escapeHtml(n.value||'')}</pre>`;
   case 'heading':return `<h${Math.min(4,(n.depth||1)+1)} style="color:#111827;line-height:1.35;margin:20px 0 10px">${children()}</h${Math.min(4,(n.depth||1)+1)}>`;
   case 'paragraph':return `<p style="margin:0 0 14px;line-height:1.7">${children()}</p>`;
   case 'break':return '<br>';case 'thematicBreak':return '<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0">';
   case 'link':{const href=safeDocumentUrl(n.url||'');return href?`<a href="${escapeHtml(href)}" style="color:#24558a;text-decoration:underline">${children()}</a>`:children();}
   case 'image':return escapeHtml(n.alt||'');case 'html':return escapeHtml(n.value||'');
   case 'list':return n.ordered?`<ol style="padding-left:24px">${children()}</ol>`:`<ul style="padding-left:24px">${children()}</ul>`;
   case 'listItem':return `<li style="margin-bottom:8px">${children()}</li>`;
   case 'blockquote':return `<blockquote style="border-left:3px solid #cbd5e1;margin:16px 0;padding-left:14px;color:#475569">${children()}</blockquote>`;
   case 'table':return `<table role="table" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">${(n.children||[]).map((row,i)=>`<tr>${(row.children||[]).map(cell=>`<${i===0?'th':'td'} style="border:1px solid #cbd5e1;vertical-align:top;text-align:left;${i===0?'font-weight:700;background:#f8fafc;':''}">${(cell.children||[]).map(render).join('')}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</table>`;
   case 'tableRow':return `<tr>${children()}</tr>`;case 'tableCell':return `<td style="border:1px solid #cbd5e1;vertical-align:top">${children()}</td>`;
   default:return children();
  }
 };return render(parseMarkdown(text));
}
export type Span={text:string;bold?:boolean};
export type DocBlock={spans:Span[];heading?:number;code?:boolean};
export function markdownBlocks(text:string):DocBlock[]{
 const inline=(n:DocNode,bold=false):Span[]=>n.type==='text'||n.type==='inlineCode'||n.type==='code'||n.type==='html'?[{text:n.value||'',bold}]:n.type==='break'?[{text:'\n',bold}]:n.type==='image'?[{text:n.alt||'',bold}]:n.type==='link'?[...(n.children||[]).flatMap(c=>inline(c,bold)),{text:` (${n.url||''})`,bold}]: (n.children||[]).flatMap(c=>inline(c,bold||n.type==='strong'));
 const result:DocBlock[]=[];
 const walk=(n:DocNode,prefix='')=>{
  if(n.type==='heading'){result.push({spans:inline(n,true),heading:n.depth});return;}
  if(n.type==='paragraph'||n.type==='code'){result.push({spans:[{text:prefix},...inline(n)],code:n.type==='code'});return;}
  if(n.type==='list'){(n.children||[]).forEach((item,i)=>(item.children||[]).forEach((child,j)=>walk(child,j?'':n.ordered?`${(n.start||1)+i}. `:'• ')));return;}
  if(n.type==='table'){(n.children||[]).forEach((row,i)=>result.push({spans:(row.children||[]).flatMap((c,j)=>[...(j?[{text:' | '}]:[]),...inline(c,i===0)])}));return;}
  (n.children||[]).forEach(c=>walk(c,prefix));
 };walk(parseMarkdown(text));return result;
}
