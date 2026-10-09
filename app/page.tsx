import Link from "next/link";
import { ArrowRight, ArrowUpRight, Box, CheckCircle2, Globe2, Layers3, PackageCheck, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/reveal";
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from "@/lib/constants";

const icons = [Search, PackageCheck, Truck, Store, Globe2];
const markets = ["Amazon", "Walmart", "eBay", "Other channels"];

export default function HomePage() {
  return <SiteLayout>
    <section className="aur-hero">
      <div className="aur-hero-light" aria-hidden="true" />
      <div className="aur-hero-inner">
        <span className="aur-kicker"><span /> U.S. commerce · Supplier partnerships · Marketplace distribution</span>
        <h1>Structured commerce.<br /><em>Built on trust.</em></h1>
        <p>We connect suppliers, brands, and marketplaces through disciplined sourcing, procurement, distribution, and marketplace operations.</p>
        <div className="aur-hero-actions">
          <Link href="/supplier" className="aur-pill aur-pill-primary">Become a Supplier <ArrowRight size={19} /></Link>
          <Link href="/our-process" className="aur-pill aur-pill-text">How we work <ArrowUpRight size={18} /></Link>
        </div>
        <div className="aur-hero-metrics" aria-label="Our approach">
          <span><ShieldCheck size={19} /> Verified company</span>
          <span><Layers3 size={19} /> Structured procurement</span>
          <span><Globe2 size={19} /> Marketplace reach</span>
        </div>
      </div>
      <div className="aur-hero-index"><span>01 / 06</span><span>SCROLL TO EXPLORE ↓</span></div>
    </section>
    <section className="aur-ticker" aria-label="Our commerce capabilities"><div>
      {[...CAPABILITIES, ...CAPABILITIES].map((item, i) => <span key={`${item.title}-${i}`}><span className="aur-ticker-dot" />{item.title}</span>)}
    </div></section>
    <section className="aur-section aur-intro">
      <div className="aur-section-top"><span className="aur-label">01 / Our approach</span><span>BUILT FOR LONG-TERM PARTNERSHIPS</span></div>
      <div className="aur-intro-grid">
        <Reveal><h2>Commerce built around <em>accountable partnerships.</em></h2></Reveal>
        <Reveal><div className="aur-intro-copy"><p>Auronix operates at the intersection of procurement, marketplace operations, and distribution. We work with suppliers and brands to move quality products through the right channels — efficiently, profitably, and with the operational discipline that modern commerce demands.</p><p>Our approach is practical and traceable: evaluate the opportunity, align commercial terms, verify documents, and manage the lifecycle from sourcing to marketplace performance.</p><Link href="/about">Get to know Auronix <ArrowUpRight size={18} /></Link></div></Reveal>
      </div>
      <div className="aur-proof-grid">
        <article><strong>01</strong><h3>Supplier-first review</h3><p>Every opportunity follows a structured application and due-diligence process.</p></article>
        <article><strong>02</strong><h3>Operational visibility</h3><p>Partners can track applications, documents, requests, and next actions.</p></article>
        <article><strong>03</strong><h3>Responsible access</h3><p>Dedicated seller workspaces and controlled administrative review.</p></article>
      </div>
    </section>
    <section className="aur-section aur-process" id="process">
      <div className="aur-section-top"><span className="aur-label">02 / Our process</span><span>FROM FIRST CONVERSATION TO CUSTOMER</span></div>
      <div className="aur-section-heading"><h2>From supplier catalog<br /><em>to marketplace.</em></h2><p>A structured path that turns opportunity into marketplace performance.</p></div>
      <StaggerGroup className="aur-process-grid">
        {PROCESS_STEPS.map((step, i) => { const Icon = icons[i % icons.length]; return <StaggerItem key={step.title}><article className="aur-process-card"><div className="aur-process-card-top"><Icon size={25} strokeWidth={1.5} /><span>{String(i + 1).padStart(2, "0")}</span></div><h3>{step.title}</h3><p>{step.description}</p><small>PARTNERSHIP NODE</small></article></StaggerItem>; })}
      </StaggerGroup>
      <Link className="aur-inline-link" href="/our-process">Explore the full process <ArrowUpRight size={18} /></Link>
    </section>
    <section className="aur-market">
      <div className="aur-market-inner"><div className="aur-market-copy"><span className="aur-label">03 / Distribution</span><h2>Built for<br /><em>modern marketplaces.</em></h2><p>We connect selected supplier products with established online marketplaces, creating opportunities for products to reach customers where they already shop.</p><div className="aur-market-list">{markets.map(m => <span key={m}><Globe2 size={18} /> {m}</span>)}</div></div><div className="aur-market-art" aria-label="Auronix marketplace distribution"><div className="aur-orbit aur-orbit-one" /><div className="aur-orbit aur-orbit-two" /><div className="aur-art-core"><Box size={62} strokeWidth={1} /><strong>Strategic sourcing.</strong><small>AURONIX MARKETPLACE DISTRIBUTION</small></div><span className="aur-art-chip aur-chip-one">SOURCE</span><span className="aur-art-chip aur-chip-two">DISTRIBUTE</span><span className="aur-art-chip aur-chip-three">GROW</span></div></div>
    </section>
    <section className="aur-section aur-capabilities"><div className="aur-section-top"><span className="aur-label">04 / Capabilities</span><span>WHAT WE DO</span></div><div className="aur-section-heading"><h2>Every part of commerce,<br /><em>considered.</em></h2><p>Four core capabilities define how Auronix creates value across the commerce lifecycle.</p></div><div className="aur-capability-grid">{CAPABILITIES.map((cap, i) => <article key={cap.title}><span>{String(i + 1).padStart(2, "0")}</span><ArrowUpRight size={20} /><h3>{cap.title}</h3><p>{cap.description}</p></article>)}</div></section>
    <section className="aur-section aur-principles"><div className="aur-section-top"><span className="aur-label">05 / Why Auronix</span><span>HOW WE OPERATE</span></div><div className="aur-section-heading"><h2>A straightforward partner for<br /><em>modern commerce.</em></h2><p>The principles that guide how we evaluate opportunities and build partnerships.</p></div><div className="aur-principle-grid">{WHY_AURONIX.map((item, i) => <article key={item.title}><span>{String(i + 1).padStart(2, "0")}</span><CheckCircle2 size={22} /><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
    <section className="aur-company"><div className="aur-company-inner"><div><span className="aur-label">06 / A U.S. business</span><h2>Auronix<br /><em>Commerce LLC.</em></h2><p>Auronix Commerce LLC is an active limited liability company registered in the State of Florida, United States.</p><Link href="/company-verification" className="aur-pill aur-pill-outline">Verify company <ArrowUpRight size={17} /></Link></div><div className="aur-company-card"><div className="aur-company-card-head"><ShieldCheck size={30} /><span>COMPANY DETAILS</span></div><dl><div><dt>Business name</dt><dd>Auronix Commerce LLC</dd></div><div><dt>Entity type</dt><dd>Limited Liability Company</dd></div><div><dt>Registered in</dt><dd>Florida, United States</dd></div><div><dt>Status</dt><dd>Active</dd></div></dl></div></div></section>
    <section className="aur-final"><span className="aur-label">LET’S WORK TOGETHER</span><h2>Have a catalog<br /><em>we should review?</em></h2><p>We are interested in connecting with legitimate suppliers, distributors, manufacturers, wholesalers, and quality brands.</p><div><Link href="/supplier" className="aur-pill aur-pill-primary">Become a Supplier <ArrowRight size={19} /></Link><Link href="/contact" className="aur-pill aur-pill-text">Contact Auronix <ArrowUpRight size={18} /></Link></div></section>
  </SiteLayout>;
}
