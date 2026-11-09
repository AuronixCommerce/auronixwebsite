import { AuronixMark } from "@/components/site/auronix-mark";
import { AioTryButton } from "@/components/site/aio-try-button";
import { AIO_MODELS } from "@/lib/aio/models";
import { buildSeo } from "@/lib/seo";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  Settings2,
  Zap,
} from "lucide-react";
export const metadata = buildSeo({
  title: "Introducing AIO 2",
  description:
    "Meet AIO 2, the Auronix assistant experience with selectable modes, conversation context, and reply preferences.",
  path: "/aio",
});
export default function AioPage() {
  return (
    <div className="aio-model-page">
      <section className="ax-wrap aio-model-hero">
        <AuronixMark />
        <span className="ax-kicker">INTRODUCING AIO 2</span>
        <h1>
          A clearer answer.
          <br />A better next step.
        </h1>
        <p>
          Your Auronix assistant, with a choice of modes, thoughtful
          conversation context, and replies shaped around you.
        </p>
        <div>
          <AioTryButton />
          <a href="#aio-modes" className="ax-text-link">
            Explore the modes <ArrowRight size={16} />
          </a>
        </div>
        <span className="aio-model-disclosure">
          AIO 2 is Auronix’s assistant experience. Its modes route to the AI
          models configured for this website.
        </span>
      </section>
      <section className="ax-wrap ax-section" id="aio-modes">
        <div className="ax-section-heading">
          <div>
            <span className="ax-kicker">YOUR QUESTION. YOUR CHOICE.</span>
            <h2>Meet the AIO 2 lineup.</h2>
          </div>
          <p>Choose a mode from the selector inside chat.</p>
        </div>
        <div className="aio-model-cards">
          {AIO_MODELS.map((model, i) => (
            <article className="ax-panel" key={model.id}>
              <span className="ax-kicker">{model.label}</span>
              {i === 0 ? <MessageSquare size={29} /> : <Zap size={29} />}
              <h3>{model.name}</h3>
              <p>{model.description}</p>
              <AioTryButton model={model.id}>Try {model.name}</AioTryButton>
            </article>
          ))}
        </div>
      </section>
      <section className="ax-wrap ax-section aio-model-features">
        {[
          {
            icon: BookOpen,
            title: "Context that matters",
            text: "Relevant Auronix references and your current conversation help shape the reply.",
          },
          {
            icon: Settings2,
            title: "An answer your way",
            text: "Choose brief or detailed replies, adjust tone, and control conversation memory.",
          },
          {
            icon: MessageSquare,
            title: "A practical next step",
            text: "Find a page, explore a partnership, or start a support request with confirmation.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon size={25} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="ax-wrap aio-model-bottom">
        <h2>Start with a question.</h2>
        <p>
          AI replies can be incomplete or mistaken. Verify important details.
          Application approvals and account decisions remain with the team.
          Model availability depends on the configured AI service.
        </p>
        <AioTryButton />
      </section>
    </div>
  );
}
