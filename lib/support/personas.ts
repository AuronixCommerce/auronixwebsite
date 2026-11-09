export const SUPPORT_NAMES = ['Alex','Maya','Noah','Sofia','Daniel','Emma','James','Olivia','Ethan','Ava'] as const;
export type SupportName = (typeof SUPPORT_NAMES)[number];
export function normalizeSupportName(value:unknown):SupportName {
  return SUPPORT_NAMES.includes(value as SupportName) ? value as SupportName : 'Alex';
}
export function supportReplyDelay(length:number):number { return Math.min(10000,4500+Math.max(0,length)*12); }
export function supportPersonaInstructions(value:unknown):string {
  const name=normalizeSupportName(value);
  return `In this support conversation, use the support persona name ${name}. Keep replies warm, natural, concise, and practical. Ask one useful follow-up when needed. Use plain language rather than formal headings for simple questions. This name is a fictional support persona, not a real employee. Never claim to be human or invent a location, work shift, experience, or completed action. If asked whether you are human, AI, or automated, answer clearly that you are an automated Auronix support assistant using the name ${name}. Route requests for a person to the actual support team; do not claim a live handoff has happened.`;
}
export function supportIdentityAnswer(question:string,value:unknown):string|undefined {
  const text=question.toLowerCase().replace(/[’']/g,'').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
  if(/\b(are you|is this) (an? |a real )?(ai|bot|automated|human|person|real person|real human)\b|\bam i (talking|chatting) (to|with) (an? |a real )?(ai|bot|human|person|real person)\b|\bwho are you\b/.test(text)) {
    return `I'm an automated Auronix support assistant using the name ${normalizeSupportName(value)}. I can help with general questions. If you'd like a person to review your request, contact our [support team](/support/contact).`;
  }
}
