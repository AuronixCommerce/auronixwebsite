import Link from "next/link";
import { API_PRIVACY_SUMMARY } from "@/lib/developers/terms";
export function DeveloperLegalNotice({
  privacy = false,
}: {
  privacy?: boolean;
}) {
  return (
    <section className="dev-page">
      <div className="dev-wrap">
        <article className="dev-card">
          <span className="dev-kicker">
            AIO DEVELOPER SERVICE · UPDATED NOVEMBER 13, 2026
          </span>
          <h2>
            {privacy
              ? "AIO API and manual payment privacy"
              : "Additional AIO API service terms"}
          </h2>
          <p>
            {privacy
              ? API_PRIVACY_SUMMARY
              : "AIO API access requires an email-verified account and admin approval. Usage is prepaid and metered. Credit purchases use manual payment instructions, customer transfer-reference submission, and independent admin verification. The live playground uses the same paid credit balance. Current prices, usage charges, cancellation and refund requests, key security, and service availability are described in the API Terms."}
          </p>
          <Link className="dev-primary" href="/aio/developers/terms">
            Read the AIO API Terms &amp; privacy details
          </Link>
        </article>
      </div>
    </section>
  );
}
