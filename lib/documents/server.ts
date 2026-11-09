import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBrandedPdf, type PdfContent, type PdfAssets } from './pdf';
let assets:Promise<PdfAssets>|undefined;
export async function serverPdf(content:PdfContent){
 assets ||= Promise.all(['fonts/manrope-400.ttf','fonts/manrope-700.ttf','auronix-signature.jpeg'].map(file=>readFile(path.join(process.cwd(),'public',file)))).then(([regular,bold,logo])=>({regular,bold,logo}));
 return createBrandedPdf(content,await assets);
}
