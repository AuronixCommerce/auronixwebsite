'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, Headphones, ShieldCheck } from 'lucide-react';
import { SUPPORT_NAMES, normalizeSupportName } from '@/lib/support/personas';
import { Spinner } from '@/components/design/primitives';

const Conversation = dynamic(
  () => import('./support-conversation').then(module => module.SupportConversation),
  { loading: () => <div className="ac-support-connecting" role="status"><Spinner className="h-6 w-6"/><p>Starting your support chat…</p></div>, ssr: false },
);

export function SupportWorkspace({ seller = false }: { seller?: boolean }) {
  const [phase, setPhase] = useState<'start'|'connecting'|'connected'>('start');
  const [agentName,setAgentName] = useState('Alex');
  useEffect(()=>{try{const key='auronix-support-persona-v1';const stored=sessionStorage.getItem(key);const name=stored?normalizeSupportName(stored):SUPPORT_NAMES[Math.floor(Math.random()*SUPPORT_NAMES.length)];sessionStorage.setItem(key,name);setAgentName(name);}catch{setAgentName(SUPPORT_NAMES[Math.floor(Math.random()*SUPPORT_NAMES.length)]);}},[]);
  const [ticketReference, setTicketReference] = useState('');
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => document.documentElement.style.setProperty('--ac-support-vh', `${viewport?.height ?? window.innerHeight}px`);
    resize();
    viewport?.addEventListener('resize', resize);
    return () => { viewport?.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--ac-support-vh'); };
  }, []);
  useEffect(() => { if (phase !== 'connecting') return; const timer = window.setTimeout(() => setPhase('connected'), 1600); return () => window.clearTimeout(timer); }, [phase]);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('from') === 'application') {
        const application = JSON.parse(sessionStorage.getItem('auronix-application-ai') || 'null');
        if (application && application.expiresAt > Date.now() && typeof application.message === 'string') {
          setPhase('connected');
          return;
        }
      }
      const stored = window.sessionStorage.getItem('auronix-support-handoff');
      if (!stored) return;
      const handoff = JSON.parse(stored);
      if (typeof handoff?.ticketId !== 'string') return;
      setTicketReference(handoff.ticketId);
      setPhase('connecting');
      window.sessionStorage.removeItem('auronix-support-handoff');
    } catch {
      // A handoff is optional; visitors can always start a fresh support chat.
    }
  }, []);
  return (
    <div className="ac-support-room">
      <nav className="ac-support-room-nav" aria-label="Support navigation">
        <Link href={seller ? '/seller/support' : '/support'}><ArrowLeft size={18}/>Support center</Link>
        <Link href={seller ? '/seller/support' : '/support/contact'}>Contact the team<ArrowRight size={16}/></Link>
      </nav>
      {phase === 'connected' ? <Conversation seller={seller} agentName={agentName} ticketReference={ticketReference}/> : phase === 'connecting' ? (<section className="ac-support-connecting" role="status"><Spinner className="h-8 w-8"/><p>Starting your conversation with {agentName}…</p><small>{ticketReference ? `Ticket ${ticketReference}` : 'Please wait a moment'}</small></section>) : (
        <section className="ac-support-start">
          <span className="ac-support-avatar"><Headphones size={27}/></span>
          <p className="ac-eyebrow">AURONIX SUPPORT</p>
          <h1>Let’s get you sorted.</h1>
          <p>Tell us what’s happening and we’ll help you find your next step.</p>
          <button className="ac-button" onClick={() => setPhase('connecting')}>Start support chat<ArrowRight size={18}/></button>
          <Link href={seller ? '/seller/support' : '/support/contact'}>Need help from the team?</Link>
          <small><ShieldCheck size={15}/>No passwords or payment details</small>
        </section>
      )}
    </div>
  );
}
