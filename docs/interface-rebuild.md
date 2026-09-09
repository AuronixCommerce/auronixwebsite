# Auronix interface rebuild

Review branch: `feat/auronix-interface-rebuild`.
Baseline: `4a632fc74299fceb3f7a7c49eda80cdd68f4fc17`.

## Architecture

`app/interface.css` defines the shared material, typography, responsive, focus, form, workspace and motion system using the existing brand color variables. `components/design/motion.tsx` centralizes spring configuration and reduced-motion behavior. Heavy command search code is loaded on first use.

The public shell, floating header, grouped mega navigation, custom mobile sheet, page heroes, homepage, process journey, solutions presentation, supplier journey, verification controls and footer have been rebuilt. Existing admin and seller workspaces adopt shared surfaces, navigation, controls and loading states. Original page routes and backend handlers remain in place.

Reusable components live in `components/design`, with accessible Radix controls from `components/ui`. Search covers static page content, solutions, help articles, default FAQs and publicly loaded managed FAQs. The checked-in public text index is `lib/design/public-search.json`; update it when public copy changes. Private records are never indexed.

Supplier autosave retains only country and distribution model for the current browser session. It does not save contact details, messages, consent, documents, passwords or tokens. Existing submission payloads and endpoints are retained.

## Validation

- TypeScript check passed.
- Production compilation and 135 generated entries passed using synthetic Firebase client configuration and the existing E2E maintenance bypass.
- Lint passed with six warnings already present in the baseline (four image warnings, two effect dependency warnings).
- Four existing AI memory unit tests passed using `npx playwright test --config=playwright.unit.config.ts` without launching a browser.
- Source preservation check: `node scripts/check-ui-preservation.cjs` checks 100 protected files, 129 original page/API route files and 55 metadata declarations against the baseline.
- Browser checks covered desktop mega navigation, mobile navigation sheet, command search, fuzzy matching, keyboard open/close and result navigation, and supplier required-field/email errors.
- Homepage width checks covered 320, 390, 430, 768, 1024, 1440 and 2560 pixels. Journey and compact commerce-diagram overflow found during checks was repaired; the 320-pixel page was rechecked without document overflow.

## Remaining acceptance checks

This branch is a reviewable implementation, not a certification that every requested UX detail and every authenticated flow has passed end-to-end acceptance. Full per-route responsive/accessibility testing, form success states, authenticated admin/seller actions, uploads, Firebase reads/writes, email and AI integration regression tests still need the real project environment. No live Firebase, Admin SDK, mail or Groq credentials were available. Dynamic blog sitemap loading therefore reported the existing missing-credentials warning during the local build. Core Web Vitals have not been measured in production.

No production deployment was performed. Temporary responsive test files, the temporary frame-header exception and synthetic environment configuration are not part of this branch.
