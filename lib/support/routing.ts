import type { SupportName } from './personas';
type Profile={name:SupportName;topic:string;focus:string;rules:Array<[RegExp,number]>};
export const SUPPORT_PROFILES:Profile[]=[
 {name:'Alex',topic:'general support',focus:'General company questions and choosing a useful next step.',rules:[]},
 {name:'Maya',topic:'seller applications',focus:'Application drafts, tracking, review stages and onboarding guidance. Never promise approval.',rules:[[/\b(application|applications|applicant|onboarding|resume id|tracking id)\b/i,8],[/\b(apply|approval|invitation)\b/i,5]]},
 {name:'Noah',topic:'login and account security',focus:'Sign-in, password recovery, MFA and account access. Never request passwords, OTPs or reset links.',rules:[[/\b(password|sign.?in|log.?in|mfa|two.factor|account access|locked out)\b/i,15],[/\b(security|reset link)\b/i,7]]},
 {name:'Sofia',topic:'email and verification',focus:'Missing emails, delivery delays and verification steps. Never request the visitor’s secret verification code.',rules:[[/\b(otp|verification|verify)\b/i,12],[/\b(email|emails|inbox|spam)\b/i,8],[/\b(code not|code is|code doesnt|code expired|missing code)\b/i,8]]},
 {name:'Daniel',topic:'catalogs and products',focus:'Seller catalog management, product fields, images and uploads.',rules:[[/\b(catalog|catalogs|catalogue|sku|product upload|product image|inventory)\b/i,12],[/\b(products|product)\b/i,4]]},
 {name:'Emma',topic:'supplier partnerships',focus:'Supplier relationships, wholesale inquiries and partnership next steps. Never invent commercial terms.',rules:[[/\b(supplier|suppliers|wholesale|manufacturer|distributor|partnership|sourcing|procurement)\b/i,12]]},
 {name:'James',topic:'marketplace and affiliate shop',focus:'Marketplace guidance and the affiliate shop. Amazon handles affiliate checkout, payments, delivery, refunds and returns.',rules:[[/\b(amazon|marketplace|affiliate|affliate|shop|checkout|order|shipping|refund|return)\b/i,10]]},
 {name:'Olivia',topic:'website troubleshooting',focus:'Broken pages, errors, browser issues and website controls.',rules:[[/\b(404|500|broken|blank page|website error|browser|not responsive|button|not loading|crash|page error)\b/i,12]]},
 {name:'Ethan',topic:'privacy and policies',focus:'Published privacy, legal and policy information and routing data-rights requests to the team.',rules:[[/\b(privacy|policy|policies|terms|cookies|delete my data|data request|legal)\b/i,14]]},
 {name:'Ava',topic:'notifications and support tickets',focus:'Notification preferences, support ticket references and reaching the actual support team.',rules:[[/\b(notification|notifications|ticket|tickets|support request|support email)\b/i,10]]},
];
export function getSupportProfile(name:unknown){return SUPPORT_PROFILES.find(p=>p.name===name)||SUPPORT_PROFILES[0];}
export function routeSupportIssue(question:string,currentName:unknown){
 const current=getSupportProfile(currentName),text=question.toLowerCase().replace(/[’']/g,'');
 const scored=SUPPORT_PROFILES.map(profile=>({profile,score:profile.rules.reduce((sum,[pattern,points])=>sum+(pattern.test(text)?points:0),0)}));
 const highest=Math.max(...scored.map(p=>p.score));if(!highest)return current;
 return scored.find(p=>p.score===highest&&p.profile.name===current.name)?.profile||scored.find(p=>p.score===highest)!.profile;
}
export function supportTransferMessage(name:unknown){const profile=getSupportProfile(name);return `Switching this chat to ${profile.name} for ${profile.topic}.`;}
