import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Globe2, Layers3, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { Reveal } from "@/components/site/reveal";
import { CommerceStage } from "@/components/site/commerce-stage";
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from "@/lib/constants";

export default function HomePage() {
  return (
    <SiteLayout>
      <section className="nx-hero">
        <div className="nx-hero-grain" aria-hidden="true" />
        <div className="nx-hero-layout">
          <div className="nx-hero-copy">
            <span className="nx-meta"><i /> U.S. COMMERCE / SUPPLIER PARTNERSHIPS</span>
            <h1>Commerce<br />moves <em>here.</em></h1>
            <p>We connect suppliers, brands, and marketplaces through disciplined sourcing, procurement, distribution, and marketplace operations.</p>
            <div className="nx-hero-actions">
              <Link className="nx-action nx-action-lime" href="/supplier">Become a supplier <ArrowUpRight size={19} /></Link>
              <Link className="nx-action nx-action-quiet" href="/our-process">Explore our process <ArrowRight size={19} /></Link>
            </div>
            <div className="nx-hero-bottom"><span>01 — 06</span><a href="#approach">SCROLL TO EXPLORE <ArrowDown size={16} /></a></div>
          </div>
          <CommerceStage />
        </div>
      </section>

      <div className="nx-trustbar">
        <span>BUILT ON TRUST</span>
        <div><ShieldCheck size={18} /> Verified company</div>
        <div><Layers3 size={18} /> Structured procurement</div>
        <div><Globe2 size={18} /> Marketplace reach</div>
      </div>

      <section className="nx-editorial nx-approach" id="approach">
        <div className="nx-section-line"><span>01 / THE APPROACH</span><span>PROGRESS THROUGH PARTNERSHIP</span></div>
        <div className="nx-approach-grid">
          <Reveal><h2>Better commerce<br />starts with <em>better<br />connections.</em></h2></Reveal>
          <div className="nx-approach-aside">
            <p>Auronix operates at the intersection of procurement, marketplace operations, and distribution. We work with suppliers and brands to move quality products through the right channels — efficiently, profitably, and with the operational discipline that modern commerce demands.</p>
            <p>Our approach is practical and traceable: evaluate the opportunity, align commercial terms, verify documents, and manage the lifecycle from sourcing to marketplace performance.</p>
            <Link href="/about">About Auronix <ArrowUpRight size={20} /></Link>
          </div>
        </div>
        <div className="nx-proof">
          <div><span>01</span><h3>Supplier-first review</h3><p>Every opportunity follows a structured application and due-diligence process.</p></div>
          <div><span>02</span><h3>Operational visibility</h3><p>Partners can track applications, documents, requests, and next actions.</p></div>
          <div><span>03</span><h3>Responsible access</h3><p>Dedicated seller workspaces and controlled administrative review.</p></div>
        </div>
      </section>

      <section className="nx-process">
        <div className="nx-section-line"><span>02 / OUR PROCESS</span><span>FROM SOURCE TO MARKETPLACE</span></div>
        <div className="nx-process-head"><h2>Every move<br /><em>has a purpose.</em></h2><p>A structured path that turns opportunity into marketplace performance.</p></div>
        <div className="nx-process-list">
          {PROCESS_STEPS.map((step, i) => (
            <article key={step.title}>
              <span className="nx-process-number">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <ArrowUpRight size={24} strokeWidth={1.4} />
            </article>
          ))}
        </div>
        <Link href="/our-process" className="nx-inline">See how we work <ArrowUpRight size={20} /></Link>
      </section>

      <section className="nx-distribution">
        <div className="nx-distribution-grid">
          <div>
            <span className="nx-meta"><i /> 03 / MARKETPLACE DISTRIBUTION</span>
            <h2>Reach the<br />right <em>markets.</em></h2>
            <p>We connect selected supplier products with established online marketplaces, creating opportunities for products to reach customers where they already shop.</p>
            <div className="nx-market-tags"><span>AMAZON</span><span>WALMART</span><span>EBAY</span><span>OTHER CHANNELS</span></div>
          </div>
          <div className="nx-distribution-display" aria-label="Source to marketplace distribution">
            <div className="nx-display-header"><span>AURONIX / DISTRIBUTION</span><span>US MARKETPLACE NETWORK ↗</span></div>
            <div className="nx-display-route"><span>SUPPLIER</span><i /><span>AURONIX</span><i /><span>MARKETPLACE</span></div>
            <div className="nx-display-symbol" aria-hidden="true"><span>AX</span></div>
            <div className="nx-display-footer"><span>STRATEGIC SOURCING</span><span>STRUCTURED OPERATIONS</span></div>
          </div>
        </div>
      </section>

      <section className="nx-editorial nx-capabilities">
        <div className="nx-section-line"><span>04 / CAPABILITIES</span><span>WHAT WE DO</span></div>
        <div className="nx-section-intro"><h2>Built for the<br /><em>whole journey.</em></h2><p>Four core capabilities define how Auronix creates value across the commerce lifecycle.</p></div>
        <div className="nx-capability-grid">
          {CAPABILITIES.map((cap, i) => <article key={cap.title}>
            <div className="nx-capability-top"><span>{String(i + 1).padStart(2, "0")} / 04</span><ArrowUpRight size={22} /></div>
            <h3>{cap.title}</h3><p>{cap.description}</p>
          </article>)}
        </div>
      </section>

      <section className="nx-principles">
        <div className="nx-section-line"><span>05 / THE AURONIX STANDARD</span><span>HOW WE OPERATE</span></div>
        <div className="nx-section-intro"><h2>Good business<br />is <em>intentional.</em></h2><p>The principles that guide how we evaluate opportunities and build partnerships.</p></div>
        <div className="nx-principles-grid">{WHY_AURONIX.map((item, i) => <article key={item.title}><span>{String(i + 1).padStart(2, "0")}</span><Check size={21} /><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
      </section>

      <section className="nx-company">
        <div className="nx-company-copy">
          <span className="nx-meta"><i /> 06 / REGISTERED IN FLORIDA</span>
          <h2>Real company.<br /><em>Real commitment.</em></h2>
          <p>Auronix Commerce LLC is an active limited liability company registered in the State of Florida, United States.</p>
          <Link href="/company-verification" className="nx-action nx-action-dark">Verify our company <ArrowUpRight size={19} /></Link>
        </div>
        <div className="nx-company-record"><div className="nx-record-top"><ShieldCheck size={29} /><span>COMPANY RECORD / 2026</span></div><dl><div><dt>BUSINESS NAME</dt><dd>Auronix Commerce LLC</dd></div><div><dt>ENTITY TYPE</dt><dd>Limited Liability Company</dd></div><div><dt>REGISTERED IN</dt><dd>Florida, United States</dd></div><div><dt>STATUS</dt><dd><i /> Active</dd></div></dl><span className="nx-record-footer">BUILT FOR LONG-TERM PARTNERSHIPS</span></div>
      </section>

      <section className="nx-final">
        <span className="nx-meta"><i /> LET'S BUILD SOMETHING</span>
        <h2>Have a catalog<br />we should <em>see?</em></h2>
        <p>We are interested in connecting with legitimate suppliers, distributors, manufacturers, wholesalers, and quality brands.</p>
        <div><Link href="/supplier" className="nx-action nx-action-lime">Become a supplier <ArrowUpRight size={19} /></Link><Link href="/contact" className="nx-action nx-action-quiet">Contact Auronix <ArrowRight size={19} /></Link></div>
      </section>
    </SiteLayout>
  );
}
