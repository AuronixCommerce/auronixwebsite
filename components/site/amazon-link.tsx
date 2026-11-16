import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AMAZON_STORE_URL } from "@/lib/constants";

export function AmazonBadge({ className = "" }: { className?: string }) {
  // Unaltered Amazon-provided US horizontal badge; see docs/amazon-store.md.
  return <img src="/brand/available-at-amazon.png" width={1500} height={242} alt="Available at Amazon" className={`amazon-badge ${className}`} />;
}
export function AmazonLink({ destination = "store", compact = false, className = "", onClick }: {
  destination?: "page" | "store"; compact?: boolean; className?: string; onClick?: () => void;
}) {
  const content = <><AmazonBadge />{!compact && <span>Shop AuronixDirect</span>}<ArrowUpRight size={16} aria-hidden="true" /></>;
  const props = { className: `amazon-link ${compact ? "amazon-link-compact" : ""} ${className}`, onClick };
  return destination === "page"
    ? <Link {...props} href="/amazon-store" aria-label="Explore the AuronixDirect Amazon store">{content}</Link>
    : <a {...props} href={AMAZON_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Shop AuronixDirect on Amazon (opens a new tab)">{content}</a>;
}
