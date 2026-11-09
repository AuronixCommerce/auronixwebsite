import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { markdownBlocks, type Span } from './markdown';
export type PdfContent={title:string;subtitle?:string;markdown:string;source?:string};
export type PdfAssets={regular:Uint8Array;bold:Uint8Array;logo:Uint8Array};
export async function createBrandedPdf(content:PdfContent,assets:PdfAssets):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(assets.regular,{subset:true}),bold=await pdf.embedFont(assets.bold,{subset:true});
 const logo=await pdf.embedJpg(assets.logo);const W=595.28,H=841.89,M=48,ink=rgb(.09,.12,.17),muted=rgb(.35,.4,.47),blue=rgb(.16,.31,.48);
 const supported=new Set(regular.getCharacterSet());
 const clean=(s:string)=>Array.from(s.replace(/[\u0000-\u0008\u000b-\u001f]/g,'')).map(c=>supported.has(c.codePointAt(0)!)?c:c==='\n'||c==='\t'?c:'?').join('');
 let page:PDFPage,y=0;
 const newPage=()=>{page=pdf.addPage([W,H]);page.drawText('AURONIX COMMERCE LLC',{x:M,y:H-53,font:bold,size:12,color:ink});page.drawText(clean(content.subtitle||'OFFLINE DOCUMENT'),{x:M,y:H-73,font:regular,size:9,color:blue});page.drawImage(logo,{x:W-M-70,y:H-111,width:70,height:70});page.drawLine({start:{x:M,y:H-121},end:{x:W-M,y:H-121},thickness:.7,color:rgb(.81,.84,.88)});y=H-149;};
 const ensure=(height:number)=>{if(y-height<69)newPage();};
 const paragraph=(spans:Span[],size=10.5,heading=false)=>{
  const leading=size*1.55;let x=M;let lineHasText=false;
  ensure(heading?leading*3:leading);
  const nextLine=()=>{y-=leading;x=M;lineHasText=false;ensure(leading);};
  for(const span of spans){const font=span.bold||heading?bold:regular;const value=clean(span.text);
   for(const token of value.split(/(\n|[ \t]+)/).filter(Boolean)){
    if(token==='\n'){nextLine();continue;}
    const word=/^[ \t]+$/.test(token)?' ':token;const width=font.widthOfTextAtSize(word,size);
    if(x+width>W-M&&lineHasText)nextLine();
    if(word===' '&&!lineHasText)continue;
    for(const character of word){const cw=font.widthOfTextAtSize(character,size);if(x+cw>W-M&&lineHasText)nextLine();page.drawText(character,{x,y,font,size,color:heading?blue:ink});x+=cw;lineHasText=true;}
   }
  }
  y-=leading+8;
 };
 newPage();paragraph([{text:content.title,bold:true}],23,true);
 if(content.source)paragraph([{text:`Source: ${content.source}`}],8.5);
 for(const block of markdownBlocks(content.markdown)){if(block.heading)y-=7;paragraph(block.spans,block.heading?block.heading===1?17:13:block.code?9.5:10.5,!!block.heading);}
 const date=new Date().toISOString().slice(0,10),pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:M,y:53},end:{x:W-M,y:53},thickness:.5,color:rgb(.84,.86,.9)});p.drawText(`Auronix Commerce LLC | auronixcommerce.com | ${date}`,{x:M,y:37,size:7.5,font:regular,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:W-M-35,y:37,size:8,font:bold,color:muted});});
 pdf.setTitle(content.title);pdf.setAuthor('Auronix Commerce LLC');pdf.setCreator('Auronix Commerce document service');pdf.setSubject(content.subtitle||'Auronix offline document');return pdf.save();
}
