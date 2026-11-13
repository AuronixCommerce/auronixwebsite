import Link from "next/link";
import {
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";
import { AuronixMark } from "@/components/site/auronix-mark";
import { DeveloperReference } from "@/components/developers/reference";
import { DeveloperPricing } from "@/components/developers/pricing";
import { buildSeo } from "@/lib/seo";
export const metadata = buildSeo({
  title: "AIO API — Build with Auronix",
  description:
    "Apply for AIO API access. Manage API keys, prepaid credits, and token usage in one developer console.",
  path: "/aio/developers",
});
export default function Page() {
  return (
    <div className="dev-page">
      <div className="dev-wrap">
        <nav className="dev-local-nav" aria-label="Developer navigation">
          <Link href="/aio/developers" className="dev-brand">
            <AuronixMark /> AIO <span>for developers</span>
          </Link>
          <div>
            <a href="#models">Models &amp; pricing</a>
            <a href="#api-reference">API reference</a>
            <Link href="/aio/developers/terms">API Terms</Link>
            <Link href="/aio/developers/console">
              Console <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
        <section className="dev-hero">
          <div>
            <span className="dev-kicker">
              <span className="dev-dot" /> AURONIX DEVELOPER PLATFORM
            </span>
            <h1>
              Your next idea.
              <br />
              <span>Powered by AIO.</span>
            </h1>
            <p>
              Bring AIO into your own product. One text-generation API, a choice
              of models, and a clear view of every credit you use.
            </p>
            <div className="dev-actions">
              <Link className="dev-primary" href="/aio/developers/console">
                Apply for API access <ArrowRight size={17} />
              </Link>
              <Link
                className="dev-secondary"
                href="/aio/developers/console?tab=playground"
              >
                Test text API <ArrowUpRight size={16} />
              </Link>
              <a href="#api-reference" className="dev-secondary">
                Read the docs <ArrowUpRight size={16} />
              </a>
            </div>
            <p className="dev-fine">
              Email-verified accounts · Admin-reviewed access · Prepaid usage
            </p>
          </div>
          <div className="dev-hero-code">
            <div className="dev-code-label">
              <AuronixMark />
              <span>
                YOUR APP <ArrowRight size={15} /> AIO API
              </span>
              <span className="dev-badge">v1</span>
            </div>
            <DeveloperReference compact />
            <div className="dev-code-foot">
              <span className="dev-dot" /> Built for your server. Managed from
              your console.
            </div>
          </div>
        </section>
        <section className="dev-benefits" aria-label="Platform benefits">
          {[
            {
              Icon: KeyRound,
              title: "Keys for every project",
              text: "Create multiple named API keys, reveal each secret once, and revoke a key whenever you need.",
            },
            {
              Icon: ChartNoAxesCombined,
              title: "Every token accounted for",
              text: "Track model, input tokens, output tokens, and credit charges in your account’s usage ledger.",
            },
            {
              Icon: ShieldCheck,
              title: "Access with control",
              text: "Admin approval, a shared prepaid wallet, and account-wide limits keep access manageable.",
            },
          ].map(({ Icon, title, text }) => (
            <article key={title}>
              <Icon size={22} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="dev-section" id="models">
          <div className="dev-section-title">
            <div>
              <span className="dev-kicker">MODEL ACCESS</span>
              <h2>Choose the right pace.</h2>
            </div>
            <p>
              Three AIO aliases. One API contract.
              <br />
              Rates published by the Auronix team.
            </p>
          </div>
          <DeveloperPricing />
        </section>
        <section className="dev-section">
          <span className="dev-kicker">FROM SIGNUP TO FIRST REQUEST</span>
          <h2>A straightforward start.</h2>
          <div className="dev-steps">
            {[
              [
                "01",
                "Create your account",
                "Register and verify your email. Tell us what you’re building.",
              ],
              [
                "02",
                "Get approved",
                "The team reviews your use case. Track the decision in your console.",
              ],
              [
                "03",
                "Add prepaid credits",
                "Request an invoice. Verified payments become wallet credits.",
              ],
              [
                "04",
                "Start building",
                "Create your key, call the API, and watch your usage.",
              ],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="dev-section">
          <div className="dev-section-title">
            <div>
              <span className="dev-kicker">API REFERENCE</span>
              <h2>Your first request.</h2>
            </div>
            <Link className="dev-secondary" href="/aio/developers/console">
              Open developer console <ArrowUpRight size={16} />
            </Link>
          </div>
          <DeveloperReference />
        </section>
        <section className="dev-bottom">
          <AuronixMark />
          <div>
            <h2>Build something useful.</h2>
            <p>
              Start with an account. Keep every key and credit in one place.
            </p>
          </div>
          <Link className="dev-primary" href="/aio/developers/console">
            Get started <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  );
}
