import Link from "next/link";
import { Download, Code2, FileClock } from "lucide-react";
export function SdkDownloads() {
  return (
    <section className="dev-card dev-section" id="sdk-starters">
      <span className="dev-kicker">START WITH WORKING CODE</span>
      <h2>Your next integration starts here.</h2>
      <p>
        Download a server-side starter with text generation, environment
        configuration, error handling, idempotency, and a matching signed
        webhook receiver. Add your own approved API key and prepaid credits.
      </p>
      <div className="dev-model-grid">
        <article>
          <Code2 size={22} />
          <h3>Node.js</h3>
          <p>Node 20.6+ · native fetch · no npm dependencies</p>
          <a
            className="dev-primary"
            href="/downloads/aio-node-starter.zip"
            download
          >
            <Download size={15} /> Download Node.js ZIP
          </a>
        </article>
        <article>
          <Code2 size={22} />
          <h3>Python</h3>
          <p>Python 3.9+ · standard library · no pip dependencies</p>
          <a
            className="dev-primary"
            href="/downloads/aio-python-starter.zip"
            download
          >
            <Download size={15} /> Download Python ZIP
          </a>
        </article>
        <article>
          <FileClock size={22} />
          <h3>Keep your integration current.</h3>
          <p>
            Read release notes, model updates, and deprecation notices before
            upgrading.
          </p>
          <Link className="dev-secondary" href="/aio/developers/changelog">
            API version changelog
          </Link>
        </article>
      </div>
      <p className="dev-fine">
        The examples make real paid requests. Keep .env files private. Webhook
        receivers are local development examples; use your own HTTPS deployment
        and durable event-ID storage in production.
      </p>
    </section>
  );
}
