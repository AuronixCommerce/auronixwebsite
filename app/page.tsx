import Link from 'next/link';
import { ArrowRight, Boxes, Building2, ClipboardList, Factory, Handshake, Layers, Package, PackageSearch, ShieldCheck, ShoppingCart, Store, Tag, Target, Truck, Users } from 'lucide-react';
import './home-reference.css';

const shortcuts = [
  { title: 'Sourcing', href: '/solutions', icon: PackageSearch },
  { title: 'Our Products', href: '/portfolio', icon: Tag },
  { title: 'Marketplaces', href: '/marketplace-expertise', icon: Store },
  { title: 'Suppliers', href: '/supplier', icon: Users },
  { title: 'Deal Room', href: '/partner-portal', icon: Handshake },
  { title: 'Track Application', href: '/seller/application/track', icon: ClipboardList },
];
const capabilities = [
  { title: 'Procurement', text: 'Strategic buying, vendor management, and cost-efficient supply.', icon: ShoppingCart },
  { title: 'Marketplace Operations', text: 'Product listing, catalog management, performance, and growth across key marketplaces.', icon: Layers },
  { title: 'Supplier Partnerships', text: 'Long-term, mutually beneficial relationships with manufacturers, brands, and distributors.', icon: Users },
  { title: 'Distribution', text: 'Reliable fulfillment and distribution to get products to the right markets, on time.', icon: Truck },
];
const steps = [
  ['Discover', 'Identify market opportunities, category potential, and demand.'],
  ['Evaluate', 'Assess products, suppliers, and commercial fit with clear criteria.'],
  ['Source', 'Secure supply, finalize terms, and prepare for marketplace launch.'],
  ['Launch', 'List, operate, and drive initial sales across marketplaces.'],
  ['Optimize', 'Analyze performance, improve operations, and scale what works.'],
];
const strengths = [
  { title: 'Focused Procurement', text: 'Disciplined sourcing and category focus to bring competitive, high-demand products to market.', icon: Target },
  { title: 'Marketplace Expertise', text: 'Hands-on operational experience across leading marketplaces, from listing and optimization to growth and profitability.', icon: Layers },
  { title: 'Operational Discipline', text: 'A process-driven, execution-focused approach that delivers reliability, transparency, and scalable results.', icon: ShieldCheck },
];

export default function HomePage() {
  return <div className="aur-home">
    <section className="aur-hero"><div className="aur-container aur-hero-grid">
      <div><p className="aur-eyebrow">B2B COMMERCE <span>·</span> SOURCING <span>·</span> MARKETPLACES <span>·</span> DISTRIBUTION</p>
        <h1>Connect the right products to the right opportunities.</h1>
        <p className="aur-lead">A B2B commerce company built on strong supplier relationships, marketplace operations, and structured commerce growth.</p>
        <div className="aur-actions"><Link className="aur-button" href="/supplier">Become a Supplier <ArrowRight size={17} /></Link><Link className="aur-button aur-button-outline" href="/solutions">Explore our work</Link></div>
      </div>
      <div className="aur-flow" aria-label="From suppliers to products to marketplaces">
        {[{title:'Suppliers', text:'Manufacturers, brands, and wholesalers', icon:Factory}, {title:'Products', text:'Source, select, and prepare for market', icon:Boxes}, {title:'Marketplaces', text:'List, operate, and distribute across key channels', icon:Store}].map(({title,text,icon:Icon}, i) => <div className="aur-flow-item" key={title}><div className={`aur-flow-card ${i === 1 ? 'featured' : ''}`}><Icon size={40} strokeWidth={1.5} /><h2>{title}</h2><p>{text}</p></div>{i < 2 && <ArrowRight className="aur-flow-arrow" size={25} strokeWidth={1.3} aria-hidden="true" />}</div>)}
      </div>
    </div></section>
    <div className="aur-container aur-content">
      <section className="aur-row aur-ecosystem" id="explore"><div className="aur-intro"><p className="aur-eyebrow">EXPLORE THE ECOSYSTEM</p><h2>Our Commerce Ecosystem</h2><p>From sourcing to distribution, explore how we create opportunities across the value chain.</p></div><div className="aur-shortcuts">{shortcuts.map(({title,href,icon:Icon}) => <Link className="aur-shortcut" href={href} key={title}><Icon size={23} strokeWidth={1.5}/><span>{title}</span><ArrowRight size={15}/></Link>)}</div></section>
      <section className="aur-row aur-capabilities"><div className="aur-intro"><p className="aur-eyebrow">OUR CAPABILITIES</p><h2>End-to-end commerce operations.</h2><p>We bring together procurement, supplier partnerships, marketplace operations, and distribution to scale products efficiently and sustainably.</p></div><div className="aur-cap-grid">{capabilities.map(({title,text,icon:Icon}) => <article className="aur-cap-card" key={title}><span className="aur-icon"><Icon size={23} strokeWidth={1.5}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="aur-row aur-process"><div className="aur-intro"><p className="aur-eyebrow">OUR PROCESS</p><h2>A structured path from opportunity to scale.</h2><p>A repeatable, data-informed process to bring the right products to market and drive sustainable growth.</p></div><ol className="aur-steps">{steps.map(([title,text],i) => <li key={title}><span className="aur-step-number">{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
      <section className="aur-row aur-why"><div className="aur-intro"><p className="aur-eyebrow">WHY AURONIX</p><h2>Built for long-term commerce growth.</h2><p>A focused, operationally driven partner for suppliers and brands seeking sustainable marketplace success.</p></div><div className="aur-strengths">{strengths.map(({title,text,icon:Icon}) => <article key={title}><div><Icon size={29} strokeWidth={1.5}/><h3>{title}</h3></div><p>{text}</p></article>)}</div></section>
    </div>
    <section className="aur-final"><div><h2>Let’s build what’s next, together.</h2><p>We work with suppliers, distributors, manufacturers, wholesalers, and brands to bring great products to more customers through a trusted, scalable commerce platform.</p></div><Link href="/contact" className="aur-button">Connect with Auronix <ArrowRight size={17}/></Link><Building2 aria-hidden="true" className="aur-final-icon" size={120} strokeWidth={0.7}/></section>
  </div>;
}
