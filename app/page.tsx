import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, Boxes, Building2, ChartNoAxesCombined, CircleHelp, ClipboardCheck, FileCheck2, Globe2, PackageSearch, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { DiscoverySearch, AudienceSwitch } from "@/components/site/discovery-home-controls";
import { CAPABILITIES, PROCESS_STEPS, WHY_AURONIX } from "@/lib/constants";

const shortcuts = [
  { title: "Sourcing", href: "/solutions", icon: PackageSearch },
  { title: "Our products", href: "/portfolio", icon: Boxes },
  { title: "Marketplaces", href: "/marketplace-expertise", icon: Store },
  { title: "Suppliers", href: "/supplier", icon: Building2 },
  { title: "Deal room", href: "/partner-portal", icon: ClipboardCheck },
  { title: "Track application", href: "/seller/application/track", icon: FileCheck2 },
];
const opportunities = [
  { title: "Supplier partnerships", description: "Build a direct relationship with a U.S. commerce operator.", href: "/supplier", image: "warehouse", label: "PARTNERSHIP" },
  { title: "Product sourcing", description: "Explore our approach to evaluating products and opportunities.", href: "/solutions", image: "beauty", label: "SOURCING" },
  { title: "Our portfolio", description: "Discover the products and categories in our commerce portfolio.", href: "/portfolio", image: "home", label: "PRODUCTS" },
  { title: "Marketplace operations", description: "See how we prepare and manage products for online channels.", href: "/marketplace-expertise", image: "electronics", label: "MARKETPLACES" },
] as const;

export default function HomePage() {
  return <SiteLayout>
    <section className="wc-hero ng-hero">
      <div className="ng-hero-grid">
        <div className="wc-hero-inner ng-hero-copy">
          <div className="ng-hero-meta"><span><i /> U.S. COMMERCE · SUPPLIER PARTNERSHIPS</span><span>EST. FLORIDA / USA</span></div>
          <h1>Connect with the <em>right partners</em> &amp; move products forward<span className="ng-hero-period">.</span></h1>
          <p>From supplier relationships to marketplace operations, Auronix connects quality products with the channels where they belong.</p>
          <div className="ng-hero-actions"><Link href="/supplier" className="ng-action-primary">Become a supplier <ArrowUpRight size={19} /></Link><Link href="/solutions" className="ng-action-secondary">Explore our work <ArrowRight size={18} /></Link></div>
          <div className="ng-hero-search"><span className="ng-search-label">FIND YOUR WAY / 001</span><DiscoverySearch /><div className="wc-search-hint">Explore Auronix by service, product, process, or question <span>⌘ / Ctrl + K</span></div></div>
        </div>
        <div className="ng-network" role="img" aria-label="Auronix connects suppliers, products, and marketplaces through structured partnerships and distribution.">
          <div className="ng-network-top"><span>THE COMMERCE NETWORK</span><span>AX / 01</span></div>
          <div className="ng-network-field">
            <div className="ng-network-ring ng-ring-one" /><div className="ng-network-ring ng-ring-two" />
            <div className="ng-network-core"><span className="ng-core-symbol"><Boxes size={44} strokeWidth={1.15} /></span><strong>AURONIX</strong><small>COMMERCE LLC</small></div>
            <div className="ng-network-node ng-node-supplier"><Building2 size={20} /><span><small>01 / ORIGIN</small><strong>Suppliers</strong></span></div>
            <div className="ng-network-node ng-node-catalog"><PackageSearch size={20} /><span><small>02 / SELECTION</small><strong>Products</strong></span></div>
            <div className="ng-network-node ng-node-market"><Store size={20} /><span><small>03 / DESTINATION</small><strong>Marketplaces</strong></span></div>
            <div className="ng-network-scan" aria-hidden="true" />
          </div>
          <div className="ng-network-bottom"><span>Structured partnerships.<br />Purposeful distribution.</span><span>SCROLL TO EXPLORE <ArrowRight size={15} /></span></div>
        </div>
      </div>
      <div className="ng-hero-index"><span>DISCOVER THE AURONIX ECOSYSTEM</span><span>01 — 06</span></div>
      <div className="wc-shortcuts" aria-label="Explore Auronix">
        {shortcuts.map(({ title, href, icon: Icon }, index) => <Link href={href} key={title} className="wc-shortcut"><span className="ng-shortcut-index">0{index + 1}</span><Icon size={24} strokeWidth={1.5} /><strong>{title}</strong><ArrowUpRight className="ng-shortcut-arrow" size={16} /></Link>)}
      </div>
    </section>

    <section className="wc-section wc-opportunities" id="explore">
      <div className="wc-section-head"><div><span className="wc-overline">EXPLORE AURONIX</span><h2>Find your next move.</h2></div><Link href="/solutions">View all solutions <ArrowUpRight size={17} /></Link></div>
      <div className="wc-opportunity-grid">{opportunities.map((item, index) => <Link href={item.href} className="wc-opportunity" key={item.title}>
        <div className={`wc-opportunity-image wc-image-${item.image}`}><span>{String(index + 1).padStart(2, "0")} / {item.label}</span><span className="wc-card-arrow"><ArrowUpRight size={19} /></span></div>
        <div className="wc-opportunity-body"><h3>{item.title}</h3><p>{item.description}</p></div>
      </Link>)}</div>
    </section>

    <section className="wc-audience-section"><div className="wc-audience-wrap">
      <div className="wc-section-head"><div><span className="wc-overline">WORK WITH US</span><h2>Better business starts<br />with a better connection.</h2></div></div>
      <AudienceSwitch />
    </div></section>

    <section className="wc-section wc-capabilities">
      <div className="wc-section-head"><div><span className="wc-overline">WHAT WE DO</span><h2>Commerce, connected.</h2><p>Four capabilities that move a product from a promising opportunity to the right marketplace.</p></div><Link href="/solutions">Explore our services <ArrowUpRight size={17} /></Link></div>
      <div className="wc-capability-grid">{CAPABILITIES.map((cap, i) => {
        const icons = [PackageSearch, Store, Truck, ChartNoAxesCombined];
        const Icon = icons[i % icons.length];
        return <Link href="/solutions" className="wc-capability" key={cap.title}><span className="wc-capability-icon"><Icon size={26} strokeWidth={1.65} /></span><span className="wc-capability-index">0{i + 1}</span><h3>{cap.title}</h3><p>{cap.description}</p><span className="wc-capability-link">Learn more <ArrowRight size={16} /></span></Link>;
      })}</div>
    </section>

    <section className="wc-section wc-process">
      <div className="wc-section-head"><div><span className="wc-overline">A CLEAR PATH FORWARD</span><h2>How a partnership moves.</h2><p>Our process is structured, practical, and visible from first conversation to marketplace performance.</p></div><Link href="/our-process">See the full process <ArrowUpRight size={17} /></Link></div>
      <div className="wc-process-grid">{PROCESS_STEPS.map((step, i) => <div className="wc-process-step" key={step.title}><span className="wc-process-icon">{i === 0 ? <Search size={24} /> : i === 1 ? <ShieldCheck size={24} /> : i === 2 ? <Boxes size={24} /> : i === 3 ? <Store size={24} /> : <ChartNoAxesCombined size={24} />}</span><span className="wc-step-number">0{i + 1}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
    </section>

    <section className="wc-trust">
      <div className="wc-trust-copy"><span className="wc-overline">WHY AURONIX</span><h2>Built for long-term partnerships.</h2><p>Auronix Commerce LLC is an active limited liability company registered in Florida, United States. We bring discipline and accountability to every relationship.</p><Link href="/company-verification" className="wc-primary-link">Verify our company <ArrowUpRight size={18} /></Link></div>
      <div className="wc-trust-points">{WHY_AURONIX.slice(0, 3).map((item, i) => <div key={item.title}><span>{i === 0 ? <BadgeCheck size={24} /> : i === 1 ? <Globe2 size={24} /> : <ShieldCheck size={24} />}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div>
    </section>

    <section className="wc-final"><div><span className="wc-overline">YOUR NEXT STEP</span><h2>Have a catalog or an idea<br />we should see?</h2><p>We welcome conversations with legitimate suppliers, distributors, manufacturers, wholesalers, and quality brands.</p><div className="wc-final-actions"><Link href="/supplier" className="wc-primary-link">Become a supplier <ArrowRight size={19} /></Link><Link href="/contact" className="wc-secondary-link">Contact Auronix <ArrowUpRight size={19} /></Link></div></div><div className="wc-final-art" aria-hidden="true"><span><Boxes size={100} strokeWidth={1} /></span><i /><i /><i /></div></section>
    <div className="wc-help-strip"><CircleHelp size={18} /><span>Questions about working with Auronix?</span><Link href="/faq">Browse answers <ArrowRight size={15} /></Link></div>
  </SiteLayout>;
}
