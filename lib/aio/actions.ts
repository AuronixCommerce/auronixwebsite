import type { AioAction, AioRouteDecision, AioSource } from '@/lib/aio/types';

const INTERNAL_ROUTE_RE = /^\/(?!\/)[a-zA-Z0-9/_?=&%#.-]*$/;

function internalAction(
  id: string,
  label: string,
  href: string,
  kind: AioAction['kind'] = 'navigate'
): AioAction | null {
  if (!INTERNAL_ROUTE_RE.test(href)) return null;
  return { id, label, href, kind };
}

export function buildAioActions(
  decision: AioRouteDecision,
  sources: AioSource[]
): AioAction[] {
  const actions: Array<AioAction | null> = [];

  if (decision.intent === 'application_tracking') {
    actions.push(internalAction('track-application', 'Track application', '/seller/application/track', 'tracking'));
  }

  if (decision.intent === 'supplier') {
    const supplierSource = sources.find((source) => /supplier/i.test(`${source.title} ${source.route || ''}`));
    actions.push(
      internalAction(
        'supplier-application',
        'Open supplier application',
        supplierSource?.route || '/become-a-supplier'
      )
    );
  }

  if (decision.intent === 'company_verification') {
    actions.push(internalAction('company-verification', 'Open company verification', '/company-verification', 'verification'));
  }

  if (decision.intent === 'support' || decision.intent === 'live_agent') {
    actions.push(internalAction('open-support', 'Open Auronix Support', '/support', 'support'));
  }

  if (decision.intent === 'navigation' && sources[0]?.route) {
    actions.push(internalAction('open-best-match', `Open ${sources[0].title}`, sources[0].route));
  }

  if (!actions.length && sources[0]?.route && decision.intent !== 'general_question') {
    actions.push(internalAction('open-source', `Open ${sources[0].title}`, sources[0].route));
  }

  const seen = new Set<string>();
  return actions
    .filter((action): action is AioAction => Boolean(action))
    .filter((action) => {
      if (seen.has(action.href)) return false;
      seen.add(action.href);
      return true;
    })
    .slice(0, 3);
}
