import Link from "next/link";
import { ArrowDown, ArrowUpRight, Package, ShoppingBag, MessageSquare, ArrowRight } from "lucide-react";
import { AmazonBadge, AmazonLink } from "@/components/site/amazon-link";
import { AuronixMark } from "@/components/site/auronix-mark";
import { AMAZON_STORE_URL } from "@/lib/constants";
import { buildSeo } from "@/lib/seo";
import "./store.css";

export const metadata = buildSeo({ title: "AuronixDirect — Our Amazon Store", description: "Explore AuronixDirect, the Amazon selling presence of Auronix Commerce LLC. Visit the storefront, review listings, and find order support.", path: "/amazon-store" });
const steps = [
  { number: "01", title: "Explore the storefront", text: "Open AuronixDirect on Amazon to see the listings currently available to you." },
  { number: "02", title: "Find your fit", text: "Read the listing, check the condition and seller, and review the total price and delivery estimate." },
  { number: "03", title: "Continue on Amazon", text: "Place your order using Amazon’s checkout. Follow order updates in your Amazon account." },
];
export default function AmazonStorePage() {
  return <div className="amazon-page">
    <section className="amazon-hero ax-wrap">
      <div className="amazon-hero-copy"><span className="ax-kicker"><span className="amazon-status-dot" /> THE AURONIX AMAZON STOREFRONT</span>
        <h1>Your next find.<br /><span>AuronixDirect.</span></h1>
        <p>Our commerce experience, one click away. Explore products offered by AuronixDirect on Amazon.com, with the details you need to choose your next purchase.</p>
        <div className="amazon-actions"><AmazonLink /><a href="#store-details" className="amazon-text-link">Get to know the store <ArrowDown size={16} /></a></div>
        <span className="amazon-hero-note">An Amazon selling presence of Auronix Commerce LLC.</span>
      </div>
      <aside className="amazon-store-card" aria-label="AuronixDirect storefront">
        <div className="amazon-card-top"><AuronixMark /><span>AURONIX COMMERCE LLC</span><ShoppingBag size={22} /></div>
        <div className="amazon-card-center"><span>FIND US ON</span><AmazonBadge /><h2>AuronixDirect</h2><p>Browse. Choose. Make it yours.</p></div>
        <a href={AMAZON_STORE_URL} target="_blank" rel="noopener noreferrer" className="amazon-card-link"><span>amazon.com/shops/AuronixDirect</span><ArrowUpRight size={22} /><span className="sr-only"> (opens a new tab)</span></a>
      </aside>
    </section>
    <section className="amazon-intro ax-wrap" id="store-details"><span className="ax-kicker">A FAMILIAR PLACE TO SHOP</span><div><h2>AuronixDirect.<br />At home on Amazon.</h2><p>Auronix Commerce LLC works across sourcing, supplier relationships, and marketplace operations. AuronixDirect brings our Amazon selling presence into one place, so you can browse the current selection and continue your purchase on Amazon.</p></div></section>
    <section className="amazon-journey ax-wrap" aria-labelledby="amazon-how"><div className="amazon-section-title"><h2 id="amazon-how">From finding it<br />to making it yours.</h2><p>Three simple steps, all the way to Amazon.</p></div><ol>{steps.map(step => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
    <section className="amazon-details ax-wrap"><div><span className="ax-kicker">A LITTLE CLARITY BEFORE CHECKOUT</span><h2>The details<br />make the difference.</h2><Link className="amazon-text-link" href="/company-verification">About Auronix Commerce <ArrowUpRight size={16} /></Link></div><dl>
      <div><dt>Current selection & pricing</dt><dd>Amazon listings show current availability, condition, product information, and prices. These can change; review the listing before ordering.</dd></div>
      <div><dt>Seller & fulfillment</dt><dd>Check the “Sold by” and “Ships from” details on each listing. Select AuronixDirect when you intend to purchase from our seller account.</dd></div>
      <div><dt>Delivery & returns</dt><dd>Review the delivery estimate and return terms shown for your item and address on Amazon. The details vary by listing and order.</dd></div>
      <div><dt>Your order information</dt><dd>Checkout, payment, tracking, and order messages stay in your Amazon account. This page helps you reach the storefront.</dd></div>
    </dl></section>
    <section className="amazon-help ax-wrap"><div className="amazon-help-icon"><Package size={27} /></div><div><span className="ax-kicker">ALREADY PLACED AN ORDER?</span><h2>Pick up where you left off.</h2><p>In Amazon, open <strong>Your Orders</strong>, select your purchase, then use the available tracking, return, or seller-contact options. For a question about Auronix Commerce itself, our team is here to help.</p><div className="amazon-help-actions"><AmazonLink compact /><Link href="/support/contact" className="amazon-text-link"><MessageSquare size={16} /> Contact Auronix <ArrowRight size={16} /></Link></div></div></section>
    <section className="amazon-final ax-wrap"><div><span className="ax-kicker">MEET YOUR NEXT FIND</span><h2>Ready when you are.</h2></div><AmazonLink /></section>
    <p className="amazon-trademark ax-wrap">Auronix Commerce LLC operates AuronixDirect as an independent seller. Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.</p>
  </div>;
}
