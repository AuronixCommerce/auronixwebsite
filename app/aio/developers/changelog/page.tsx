import Link from "next/link";
import { API_RELEASES } from "@/lib/developers/changelog";
import { PublicApiNotices } from "@/components/developers/changelog";
import { SdkDownloads } from "@/components/developers/sdk-downloads";
import { buildSeo } from "@/lib/seo";
export const metadata = buildSeo({
  title: "AIO API Changelog & Model Updates",
  description:
    "API releases, developer updates, model changes and deprecation notices for AIO.",
  path: "/aio/developers/changelog",
});
export default function Page() {
  return (
    <div className="dev-page">
      <div className="dev-wrap">
        <nav className="dev-local-nav" aria-label="API changelog navigation">
          <Link className="dev-brand" href="/aio/developers">
            AIO <span>API changelog</span>
          </Link>
          <Link className="dev-secondary" href="/aio/developers/console">
            Developer console
          </Link>
        </nav>
        <section className="dev-section">
          <span className="dev-kicker">VERSIONED AND ACCOUNTABLE</span>
          <h1>
            What changed.
            <br />
            <span>What comes next.</span>
          </h1>
          <p className="dev-muted">
            Release notes, model updates, and deprecation notices for your AIO
            integration.
          </p>
        </section>
        <PublicApiNotices />
        <section className="dev-section">
          <span className="dev-kicker">PLATFORM RELEASES</span>
          {API_RELEASES.map((r) => (
            <article className="dev-card dev-section" key={r.id}>
              <span className="dev-badge">
                {r.version} · {r.date}
              </span>
              <h2>{r.title}</h2>
              <p>{r.body}</p>
            </article>
          ))}
        </section>
        <SdkDownloads />
      </div>
    </div>
  );
}
