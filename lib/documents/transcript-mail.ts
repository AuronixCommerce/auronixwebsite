import { escapeHtml, markdownEmailHtml, markdownBlocks } from './markdown';
import { emailButton } from '@/lib/email/design';
export type TranscriptMessage={role:'user'|'assistant';content:string};
export function transcriptMarkdown(messages:TranscriptMessage[]){return messages.map(m=>`## ${m.role==='user'?'You':'AIO'}\n\n${m.content}`).join('\n\n');}
export function transcriptPlainText(messages:TranscriptMessage[]){return messages.map(m=>`${m.role==='user'?'You':'AIO'}\n${markdownBlocks(m.content).map(b=>b.spans.map(s=>s.text).join('')).join('\n\n')}`).join('\n\n');}
export function buildTranscriptEmail(messages:TranscriptMessage[],downloadUrl:string){
 const body=messages.map(m=>`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid #e1e3e6;border-radius:14px"><tr><td style="padding:20px"><p style="font-size:10px;letter-spacing:1.5px;font-weight:700;color:#737984;margin:0 0 14px">${m.role==='user'?'YOU':'AIO &middot; AURONIX'}</p>${markdownEmailHtml(m.content)}</td></tr></table>`).join('');
 return `<h1>Your conversation,<br>kept together.</h1><p>A copy of your AIO conversation, ready to revisit whenever you need it.</p>${emailButton('Download transcript PDF',downloadUrl)}<p style="font-size:12px;color:#737984">This private download link expires in 7 days. The PDF is also attached to this email. Keep the link private.</p>${body}<p style="margin-top:24px;font-size:12px;color:#737984">AI replies may contain errors. Verify important details. This transcript was supplied from your browser.</p>`;
}
