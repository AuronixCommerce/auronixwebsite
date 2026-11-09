import { getSupportProfile } from './routing';
export const SUPPORT_NAMES = ['Alex','Maya','Noah','Sofia','Daniel','Emma','James','Olivia','Ethan','Ava'] as const;
export type SupportName = (typeof SUPPORT_NAMES)[number];
export function normalizeSupportName(value:unknown):SupportName {
  return SUPPORT_NAMES.includes(value as SupportName) ? value as SupportName : 'Alex';
}
export function supportReplyDelay(length:number):number { return Math.min(10000,4500+Math.max(0,length)*12); }
export function supportPersonaInstructions(value:unknown):string {
  const name=normalizeSupportName(value);
  const profile=getSupportProfile(name);
  return `In this support conversation, use the support persona name ${name}. Your support focus is ${profile.topic}: ${profile.focus} Keep replies warm, natural, concise, and practical. Ask one useful follow-up when needed. Use plain language rather than formal headings for simple questions. This name is a fictional support persona, not a real employee. Never claim to be human or invent a location, work shift, experience, or completed action. If asked whether you are human, AI, or automated, answer briefly and truthfully: "I'm ${name}, an AI support assistant." Route requests for a person to the actual support team; do not claim a live handoff has happened. Do not repeat your introduction, append a signature, or sign messages with your name. Your name is already shown in the interface. Mention automation when directly asked about identity, rather than adding an unsolicited identity paragraph to ordinary support replies.`;
}
export function supportIdentityAnswer(question:string,value:unknown):string|undefined {
  const text=question.toLowerCase().replace(/\bu\b/g,'you').replace(/\br\b/g,'are').replace(/[’']/g,'').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
  if(/\b(are you|you a|you an|is this) (an? |a real )?(ai|bot|automated|human|person|real person|real human|real agent)\b|\bam i (talking|chatting) (to|with) (an? |a real )?(ai|bot|human|person|real person|real agent)\b|\bwho are you\b/.test(text)) {
    return `I'm ${normalizeSupportName(value)}, an AI support assistant. For a person, [contact the team](/support/contact).`;
  }
}

export function trimSupportSignature(answer:string,value:unknown):string {
 const name=normalizeSupportName(value);
 return answer.replace(new RegExp(`\\s*(?:[—–-]\\s*|(?:best|regards|thanks),?\\s+)${name}(?:\\s*[,·|]\\s*Auronix(?:\\s+Support)?)?[.!\\s]*$`,'i'),'').trim();
}
