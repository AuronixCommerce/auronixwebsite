import { AURONIX_EMAIL_MARK } from "./brand-mark";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://auronixcommerce.com").replace(/\/+$/, "");
const SUPPORT = process.env.MAIL_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.MAIL_FROM || process.env.SMTP_USER || "business@auronixcommerce.com";
export const EMAIL_BRAND_CID = "auronix-brand-o";
export const emailLogoAttachment = () => ({ filename: "auronix-o.png", content: Buffer.from(AURONIX_EMAIL_MARK, "base64"), contentType: "image/png", contentDisposition: "inline" as const, cid: EMAIL_BRAND_CID });
export const emailEscape = (value: unknown) => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

export function emailCategory(title: string) {
  if (/code|verif|password|sign.?in|security|invitation/i.test(title)) return "ACCOUNT & SECURITY";
  if (/invoice|payment|credit|balance|billing|receipt/i.test(title)) return "DEVELOPER BILLING";
  if (/application|supplier|seller|document|partnership/i.test(title)) return "PARTNER RELATIONS";
  if (/transcript|conversation|AIO/i.test(title)) return "AIO WORKSPACE";
  if (/support|ticket|issue/i.test(title)) return "AURONIX SUPPORT";
  if (/newsletter|subscri/i.test(title)) return "AURONIX JOURNAL";
  return "AURONIX COMMERCE";
}

export function emailButton(label: string, url: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" class="email-button-table" style="margin:28px 0"><tr><td bgcolor="#181a1d" style="border-radius:12px;text-align:center;mso-padding-alt:15px 24px"><a class="email-button" href="${emailEscape(url)}" style="display:inline-block;padding:15px 24px;border:1px solid #181a1d;border-radius:12px;color:#ffffff;background:#181a1d;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;mso-padding-alt:0">${emailEscape(label)} <span aria-hidden="true" style="padding-left:14px">&#8594;</span></a></td></tr></table>`;
}

export function emailCode(code: string, note = "ONE-TIME VERIFICATION CODE") {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td class="email-code-card" align="center" bgcolor="#f4f5f6" style="padding:22px 12px;border:1px solid #e1e3e6;border-radius:16px"><p style="margin:0 0 12px;font-size:10px;line-height:16px;letter-spacing:1.6px;font-weight:700;color:#666b74">${emailEscape(note)}</p><div dir="ltr" class="email-code" style="font-family:Consolas,'Courier New',monospace;font-size:34px;font-weight:700;line-height:44px;letter-spacing:8px;color:#181a1d;white-space:nowrap">${emailEscape(code)}</div><p style="margin:12px 0 0;font-size:11px;line-height:18px;color:#666b74">Enter this code only on Auronix. Never share it.</p></td></tr></table>`;
}

export function emailShell(input: { preheader: string; title: string; body: string; footerNote?: string; category?: string; footerHtml?: string }) {
  const support = emailEscape(SUPPORT), site = emailEscape(SITE);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${emailEscape(input.title)}</title><style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table{border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0;outline:none;text-decoration:none}a{overflow-wrap:anywhere}.email-content{overflow-wrap:anywhere;word-break:break-word}.email-content h1{font-size:30px!important;letter-spacing:-1px;line-height:1.2!important;font-weight:700;margin:0 0 22px!important;color:#181a1d}.email-content h2,.email-content h3{letter-spacing:-.4px}.email-content p{margin-top:0}.email-content img{max-width:100%;height:auto}.email-content pre{white-space:pre-wrap;overflow-wrap:anywhere}.email-content table{max-width:100%}
@media only screen and (max-width:480px){.email-outer{padding:16px 8px!important}.email-header,.email-content,.email-footer{padding-left:22px!important;padding-right:22px!important}.email-content{padding-top:30px!important;padding-bottom:30px!important}.email-content h1{font-size:26px!important}.email-brand-name{font-size:15px!important}.email-brand-sub{font-size:9px!important;letter-spacing:1.5px!important}.email-code{font-size:30px!important;letter-spacing:6px!important}.email-button-table{width:100%!important}.email-button{display:block!important;text-align:center;padding-left:12px!important;padding-right:12px!important}.email-bottom{padding:20px 8px!important}}
@media(prefers-color-scheme:dark){body,.email-background{background:#101113!important}.email-card,.email-content{background:#1c1e22!important;color:#d7d9df!important}.email-card{border-color:#34373e!important}.email-content h1,.email-content h2,.email-content h3,.email-content strong{color:#f7f8fa!important}.email-content p{color:#d7d9df!important}.email-content a:not(.email-button),.email-footer a{color:#bfd3ef!important}.email-code-card,.email-content pre,.email-content code{background:#25282e!important;border-color:#41454e!important;color:#f7f8fa!important}.email-code{color:#f7f8fa!important}.email-footer{background:#191b1e!important;border-color:#34373e!important;color:#acb1bc!important}.email-bottom{color:#acb1bc!important}.email-button{background:#edf0f4!important;border-color:#edf0f4!important;color:#16181d!important}}
</style></head><body data-auronix-email="v2" style="margin:0;padding:0;background:#f0f1f3;color:#393e47;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${emailEscape(input.preheader)}&#847; &zwnj; &nbsp;</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-background" style="width:100%;background:#f0f1f3"><tr><td class="email-outer" align="center" style="padding:40px 16px 16px"><!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dfe2e7;border-radius:22px;overflow:hidden"><tr><td class="email-header" bgcolor="#181a1d" style="padding:27px 36px;background:#181a1d;border-radius:21px 21px 0 0"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="46" style="width:46px;vertical-align:middle"><a href="${site}" style="text-decoration:none"><img src="cid:${EMAIL_BRAND_CID}" width="40" height="40" alt="Auronix O" style="display:block;width:40px;height:40px;background:#ffffff;border-radius:50%"></a></td><td style="padding-left:12px;vertical-align:middle"><a href="${site}" style="text-decoration:none;color:#ffffff"><span class="email-brand-name" style="display:block;font-size:18px;line-height:23px;letter-spacing:2px;font-weight:700;color:#ffffff">AURONIX</span><span class="email-brand-sub" style="display:block;font-size:10px;line-height:17px;letter-spacing:2px;color:#c2c6cd">COMMERCE LLC</span></a></td></tr></table></td></tr><tr><td class="email-content" style="padding:38px 36px 40px;font-size:15px;line-height:1.75;color:#393e47;background:#ffffff"><p style="margin:0 0 18px;font-size:10px;font-weight:700;line-height:16px;letter-spacing:1.6px;color:#727782">${emailEscape(input.category || emailCategory(input.title))}</p>${input.body}</td></tr><tr><td class="email-footer" style="padding:24px 36px;background:#f8f9fa;border-top:1px solid #e8eaee;font-size:12px;line-height:1.8;color:#737984"><p style="margin:0 0 12px">${emailEscape(input.footerNote || "This message relates to your activity or account with Auronix Commerce LLC.")}</p>${input.footerHtml || ""}<p style="margin:0">Need a hand? <a href="mailto:${support}" style="color:#393e47;text-decoration:underline">${support}</a></p></td></tr></table><!--[if mso]></td></tr></table><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px"><tr><td align="center" class="email-bottom" style="padding:23px 12px 30px;font-size:11px;line-height:1.9;color:#777d87"><strong style="font-weight:600">Auronix Commerce LLC</strong> &middot; Florida, USA<br><a href="${site}" style="color:inherit;text-decoration:none">auronixcommerce.com</a> &nbsp;&middot;&nbsp; <a href="${site}/help" style="color:inherit;text-decoration:none">Help center</a> &nbsp;&middot;&nbsp; <a href="${site}/privacy" style="color:inherit;text-decoration:none">Privacy</a></td></tr></table></td></tr></table></body></html>`;
}

/** Preserve authored HTML, but supply the same company identity at every delivery boundary. */
export function ensureBrandedEmail(html: string, title: string) {
  if (/data-auronix-email=["']v2["']/.test(html)) return html;
  const content = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html.replace(/<!doctype[^>]*>|<\/?(?:html|head)\b[^>]*>/gi, "");
  const styles = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)?.join("") || "";
  return emailShell({ preheader: title, title, body: `${styles}${/<h1\b/i.test(content) ? "" : `<h1>${emailEscape(title)}</h1>`}${content}` });
}

function paragraphHtml(text: string) {
  // Escape first; only validated HTTPS/HTTP URLs become links. Trailing punctuation stays outside.
  return emailEscape(text).replace(/https?:\/\/[^\s<>]+/g, raw => {
    const match = raw.match(/^(.*?)([.,;!?)]+)?$/)!;
    const url = match[1];
    return `<a href="${url}" style="color:#315c8b;text-decoration:underline;word-break:break-all">${url}</a>${match[2] || ""}`;
  }).replace(/\n/g, "<br>");
}

export function professionalEmailBody(body: string, title: string, name?: string) {
  const code = body.match(/(?:verification|confirmation|security) code (?:is\s*|:\s*)([0-9]{6})\b/i)?.[1];
  const heading = code ? "Verify your email" : title;
  // Turn the first code sentence into the dedicated card; retain all action/expiry instructions.
  const remainder = code ? body.replace(/^Your [^\n.!?]*?(?:verification|confirmation|security) code (?:is\s*|:\s*)[0-9]{6}\.?\s*/i, "") : body;
  return `<h1>${emailEscape(heading)}</h1><p>Hello${name ? ` ${emailEscape(name)}` : ""},</p>${code ? `<p>Use this code to continue your requested Auronix action.</p>${emailCode(code)}` : ""}${remainder.split(/\n\s*\n/).filter(Boolean).map(p=>`<p style="margin:0 0 18px">${paragraphHtml(p)}</p>`).join("")}`;
}
