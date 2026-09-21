import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileCheck2,
  History,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

type Checkpoint = {
  label: string;
  complete: boolean;
};

type DealRoomGuideProps = {
  role: 'seller' | 'admin';
  nextAction: string;
  actionHref: string;
  actionLabel: string;
  checkpoints?: Checkpoint[];
};

const sellerSteps = [
  {
    icon: Sparkles,
    title: 'Set commercial terms',
    text: 'Keep brands, MOQ, pricing, currency, lead time, and Incoterms current.',
  },
  {
    icon: FileCheck2,
    title: 'Share private files',
    text: 'Upload catalogs, price lists, compliance records, and brand authorizations.',
  },
  {
    icon: MessageSquareText,
    title: 'Resolve review questions',
    text: 'Reply in the application thread so decisions retain their full context.',
  },
  {
    icon: History,
    title: 'Track every decision',
    text: 'See document outcomes, requested changes, notifications, and revisions.',
  },
];

const adminSteps = [
  {
    icon: Sparkles,
    title: 'Select an application',
    text: 'Every submitted application is searchable; opening one initializes its room.',
  },
  {
    icon: History,
    title: 'Compare the record',
    text: 'Review commercial terms and field-level changes across all revisions.',
  },
  {
    icon: FileCheck2,
    title: 'Decide each document',
    text: 'Approve, reject, expire, or archive files with a partner-visible note.',
  },
  {
    icon: MessageSquareText,
    title: 'Close the loop',
    text: 'Message the partner, trigger notifications, and preserve the audit trail.',
  },
];

export function DealRoomGuide({
  role,
  nextAction,
  actionHref,
  actionLabel,
  checkpoints = [],
}: DealRoomGuideProps) {
  const isSeller = role === 'seller';
  const steps = isSeller ? sellerSteps : adminSteps;

  return (
    <section className="ac-deal-guide" aria-labelledby={`${role}-deal-room-guide-title`}>
      <div className="ac-deal-guide-head">
        <div>
          <span className="ac-eyebrow">How the Deal Room works</span>
          <h2 id={`${role}-deal-room-guide-title`}>
            {isSeller ? 'One private workspace for the partnership' : 'From application to approved partnership'}
          </h2>
          <p>
            {isSeller
              ? 'This room is linked to your approved application and seller account. Only your authorized team and Auronix reviewers can access it.'
              : 'Applications appear automatically. The selected record keeps its terms, files, conversation, decisions, and history together.'}
          </p>
        </div>
        <span className="ac-deal-security"><LockKeyhole className="h-4 w-4" />Access controlled · activity recorded</span>
      </div>

      <ol className="ac-deal-guide-steps">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <span className="ac-deal-step-number">{index + 1}</span>
            <Icon className="h-5 w-5" />
            <div><strong>{title}</strong><p>{text}</p></div>
          </li>
        ))}
      </ol>

      <div className="ac-deal-guide-footer">
        <div className="ac-next-action">
          <Sparkles className="h-5 w-5" />
          <div><span>Recommended next action</span><strong>{nextAction}</strong></div>
          <Link href={actionHref}>{actionLabel}<ArrowRight className="h-4 w-4" /></Link>
        </div>
        {checkpoints.length > 0 && (
          <div className="ac-deal-checkpoints" aria-label="Deal Room readiness">
            {checkpoints.map(item => (
              <span key={item.label} data-complete={item.complete}>
                {item.complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
