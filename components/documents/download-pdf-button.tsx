'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Spinner } from '@/components/design/primitives';
export function DownloadPdfButton({title,markdown,source,contentSelector,label='Download PDF'}:{title:string;markdown?:string;source?:string;contentSelector?:string;label?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async()=>{if(busy)return;setBusy(true);setError('');try{
  const [{createBrandedPdf},regular,bold,logo]=await Promise.all([import('@/lib/documents/pdf'),fetch('/fonts/manrope-400.ttf').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();}),fetch('/fonts/manrope-700.ttf').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();}),fetch('/auronix-signature.jpeg').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();})]);
  const root=document.querySelector<HTMLElement>(contentSelector||'article');
  const extracted=root?Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,li')).filter(e=>e.tagName==='LI'||!e.parentElement?.closest('li')).map(e=>`${/^H[1-4]$/.test(e.tagName)?'## ':e.tagName==='LI'?'- ':''}${e.innerText}`).join('\n\n'):'';
  const body=markdown??(extracted||root?.innerText||'');if(!body.trim())throw Error();
  const bytes=await createBrandedPdf({title,markdown:body,source:source?new URL(source,location.origin).toString():location.href,subtitle:'OFFLINE GUIDE | AURONIX DOCUMENTS'},{regular:new Uint8Array(regular),bold:new Uint8Array(bold),logo:new Uint8Array(logo)});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=`auronix-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,90)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch{setError('PDF could not be created. Please retry.');}finally{setBusy(false);}};
 return <div className="document-pdf-download"><button type="button" className="ax-btn ax-btn-outline" onClick={download} disabled={busy}>{busy?<Spinner className="h-4 w-4"/>:<Download size={16}/>} {busy?'Preparing PDF…':label}</button>{error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
