'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
/** Progressive enhancement: content is readable before JS and with reduced motion. */
export function MotionRuntime() {
 const pathname=usePathname();
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches)return;
  const animations=new Set<Animation>();
  const seen=new WeakSet<Element>();let frame=0;let index=0;
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;const element=entry.target;observer.unobserve(element);const delay=(index++%4)*55;
    const animation=element.animate([{opacity:.15,transform:'translateY(22px)',filter:'blur(7px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0px)'}],{duration:720,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    animations.add(animation);animation.onfinish=()=>animations.delete(animation);
   }
  },{threshold:.06});
  const scan=()=>{document.querySelectorAll('.ax-hero-copy,.ax-commerce-board,.ax-pathways,.ax-section-heading,.ax-capability,.ax-approach-grid>div,.ax-approach li,.ax-principles article,.ax-cta,.ac-page-hero-grid,.ac-section-heading,.ax-page-heading,.ax-stat-card,.ax-panel,.ax-content-metrics,.ax-partner-room,.ax-auth-form>div,.ax-auth-story>div').forEach(element=>{if(seen.has(element))return;seen.add(element);observer.observe(element)})};
  scan();const mutations=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(scan)});mutations.observe(document.body,{childList:true,subtree:true});
  const stop=()=>{if(preference.matches){observer.disconnect();animations.forEach(a=>a.cancel());animations.clear()}};preference.addEventListener('change',stop);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();animations.forEach(a=>a.cancel());preference.removeEventListener('change',stop)};
 },[pathname]);
 return null;
}
