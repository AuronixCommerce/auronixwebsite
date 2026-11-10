import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  MessageSquare,
  PackageCheck,
  Play,
  ShieldCheck,
} from "lucide-react";
import { AuronixVideoGuide } from "@/components/site/auronix-video-guide";
import { DownloadPdfButton } from "@/components/documents/download-pdf-button";
import {
  OVERVIEW_CHAPTERS,
  OVERVIEW_GUIDE_MARKDOWN,
  videoTimestamp,
} from "@/lib/auronix-video-guide";
import { buildSeo } from "@/lib/seo";
import "./guide.css";
export const metadata = buildSeo({
  title: "Meet Auronix — Video Guide",
  description:
    "Watch a two-minute guide to Auronix Commerce and AIO. Explore chapters, read the transcript, and find your next step.",
  path: "/guide",
  image: "/guides/auronix-overview.jpg",
  keywords: [
    "Auronix video guide",
    "AIO tutorial",
    "getting started",
    "supplier application",
    "Auronix overview",
  ],
});
export default function GuidePage() {
  return (
    <div className="av-guide-page">
      <header className="ax-wrap av-guide-hero">
        <div>
          <span className="ax-kicker">A GOOD PLACE TO START</span>
          <h1>
            Meet Auronix.
            <br />
            <span>See what’s possible.</span>
          </h1>
          <p>
            From commerce connections to a clearer answer with AIO. Take a
            two-minute tour, then choose your next step.
          </p>
          <div className="av-guide-hero-actions">
            <Link className="ax-btn" href="/aio/chat">
              Try it with AIO <ArrowRight size={16} />
            </Link>
            <DownloadPdfButton
              title="Meet Auronix — Video Guide"
              markdown={OVERVIEW_GUIDE_MARKDOWN}
              source="/guide"
              label="Download guide (PDF)"
            />
          </div>
        </div>
        <aside className="av-guide-intro-note">
          <span>
            <Clock3 size={16} />2 MINUTES, ONE CONNECTED VIEW
          </span>
          <p>
            Watch the overview.
            <br />
            Find your way forward.
          </p>
          <a href="#watch-overview">
            Start watching <Play size={14} />
          </a>
        </aside>
      </header>
      <div id="watch-overview" className="ax-wrap av-guide-watch">
        <AuronixVideoGuide />
      </div>
      <section
        className="ax-wrap av-guide-next"
        aria-labelledby="next-step-title"
      >
        <div className="av-guide-section-title">
          <span className="ax-kicker">YOUR TURN</span>
          <h2 id="next-step-title">
            Turn a quick look
            <br />
            into your next step.
          </h2>
          <p>Choose the path that fits what brought you here.</p>
        </div>
        <div className="av-guide-cards">
          {[
            {
              icon: MessageSquare,
              title: "Start with a question",
              text: "Open AIO, choose a mode, and ask about Auronix, your application, or what to do next.",
              href: "/aio/chat",
              label: "Open AIO chat",
            },
            {
              icon: PackageCheck,
              title: "Explore a partnership",
              text: "Tell us about your supply business, or start a seller application. Use Actions in chat for guided steps.",
              href: "/supplier",
              label: "Become a supplier",
            },
            {
              icon: BookOpen,
              title: "Get practical help",
              text: "Follow a detailed guide for account access, verification, applications, catalogs, and support.",
              href: "/help",
              label: "Visit the Help Center",
            },
          ].map(({ icon: Icon, ...card }) => (
            <article key={card.title}>
              <span>
                <Icon size={20} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <Link href={card.href}>
                {card.label}
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section
        className="ax-wrap av-guide-how"
        aria-labelledby="aio-first-steps"
      >
        <div>
          <span className="ax-kicker">AIO, STEP BY STEP</span>
          <h2 id="aio-first-steps">
            A little guidance.
            <br />A clear next move.
          </h2>
          <Link className="ax-text-link" href="/aio">
            Explore AIO modes <ArrowRight size={15} />
          </Link>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Ask your question.</h3>
              <p>
                Open the full-page workspace or popup chat. Choose your mode and
                adjust the reply style to suit your question.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Review your next action.</h3>
              <p>
                Open Actions for applications, newsletter preferences, support,
                and account tools. When asked, verify your email in the
                dedicated code box, then review and confirm.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Keep what’s useful.</h3>
              <p>
                Sign in and leave chat memory on to search and rename
                conversations, pin answers, and return to your account history.
                You can also request an emailed copy.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section
        className="ax-wrap av-guide-transcript"
        aria-labelledby="video-transcript-heading"
      >
        <details>
          <summary>
            <span>
              <FileText size={19} />
              <span id="video-transcript-heading">
                Prefer to read? Open the video transcript.
              </span>
            </span>
            <span className="av-guide-expand" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="av-guide-transcript-body">
            {OVERVIEW_CHAPTERS.map((chapter) => (
              <article key={chapter.start}>
                <h3>
                  <span>{videoTimestamp(chapter.start)}</span>
                  {chapter.title}
                </h3>
                <p>{chapter.transcript}</p>
              </article>
            ))}
          </div>
        </details>
      </section>
      <section className="ax-wrap av-guide-bottom">
        <div>
          <ShieldCheck size={20} />
          <p>
            Use your own account for account tools, check supporting sources,
            and keep verification codes in the dedicated code box.
          </p>
        </div>
        <div>
          <Link href="/seller/apply">
            Seller application <ArrowRight size={14} />
          </Link>
          <Link href="/status">
            Service status <ArrowRight size={14} />
          </Link>
          <Link href="/support/contact">
            Contact the team <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
