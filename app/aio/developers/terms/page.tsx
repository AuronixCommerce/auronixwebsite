import Link from "next/link";
import { buildSeo } from "@/lib/seo";
import { API_TERMS_VERSION } from "@/lib/developers/model";
import { API_TERMS_SECTIONS } from "@/lib/developers/terms";
import { DownloadPdfButton } from "@/components/documents/download-pdf-button";
export const metadata = buildSeo({
  title: "AIO API Terms, Manual Payments & Privacy",
  description:
    "AIO developer terms covering approval, launch pricing, manual payments, metered tests, refunds, keys, and API privacy.",
  path: "/aio/developers/terms",
});
export default function Page() {
  return (
    <div className="dev-page">
      <div className="dev-wrap">
        <div className="dev-local-nav">
          <Link className="dev-brand" href="/aio/developers">
            AIO <span>API service terms</span>
          </Link>
          <Link className="dev-secondary" href="/aio/developers/console">
            Developer console
          </Link>
        </div>
        <div className="dev-section">
          <span className="dev-kicker">
            EFFECTIVE NOVEMBER 13, 2026 · {API_TERMS_VERSION}
          </span>
          <h1>
            Clear terms.
            <br />
            <span>Clearer expectations.</span>
          </h1>
          <p className="dev-muted">
            AIO developer access, manual payment approval, usage credits, live
            tests, and privacy.
          </p>
          <div className="dev-actions">
            <DownloadPdfButton
              title="AIO API Terms"
              source="/aio/developers/terms"
              markdown={
                `Effective November 13, 2026\nVersion: ${API_TERMS_VERSION}\n\n` +
                API_TERMS_SECTIONS.map(
                  (s) => `## ${s.title}\n\n${s.body}`,
                ).join("\n\n")
              }
            />
            <Link className="dev-text-link" href="/terms">
              Website Terms
            </Link>
            <Link className="dev-text-link" href="/privacy">
              Privacy Policy
            </Link>
          </div>
        </div>
        <div className="dev-terms-body">
          {API_TERMS_SECTIONS.map((s, i) => (
            <section key={s.title} id={`api-term-${i + 1}`}>
              <span className="dev-mono">{String(i + 1).padStart(2, "0")}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
        <div className="dev-bottom">
          <div>
            <h2>Need a payment reviewed?</h2>
            <p>
              Include your credit request ID and transfer reference when
              contacting the team.
            </p>
          </div>
          <Link className="dev-primary" href="/support/contact">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
