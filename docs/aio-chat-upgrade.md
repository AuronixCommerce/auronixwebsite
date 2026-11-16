# AIO chat upgrade

## Visitor experience

- Centered original O logo in both launcher states, with the offset bot badge removed.
- Responsive glass chat panel, optional expanded desktop layout, starter prompts, and a multiline composer.
- In-chat settings for reply length, tone, current-conversation context, supporting references, browser memory, and Enter-to-send.
- Uses administrator reply defaults until a visitor chooses an override; visitors can restore defaults.
- Markdown tables, lists, links, and code blocks render through react-markdown and remark-gfm, without raw HTML.
- Copy confirmation, feedback selection, retry without duplicated questions, and direct regenerate requests.
- Streaming preserves partially completed answers on failures/stops and offers continuation for provider token-limit completion.
- Automatic scrolling pauses when the reader scrolls up; a button returns to the newest answer.

## Reply handling

New-chat boundaries isolate provider context. Outgoing history is bounded to 18 current-session messages. Context-off sends only the latest question. Selecting page text supplies bounded reference data; new chats clear that selection.

The SSE parser handles split UTF-8 sequences, CRLF boundaries, and final frames without a trailing blank line. Client request generations prevent a stopped request from overwriting a newer conversation. Provider requests support cancellation and a timeout. GPT-OSS-specific reasoning parameters are applied only to compatible models. A model fallback is attempted only before any reply text has been emitted.

Administrator instructions, tone/length defaults, response token budget, retrieval count, variation, primary model, and fallback model are wired to the public assistant. Existing identity, retrieval, maintenance, support-ticket confirmation, and human approval boundaries remain in place. Settings updates validate values and patch supplied fields instead of replacing all existing settings.

## Persistence

Browser preferences use `auronix-ai-preferences-v1`; the existing transcript key is retained. Disabling memory removes the locally saved transcript and sends `saveHistory: false` for subsequent requests. Earlier account history is not deleted by that switch. New-chat boundaries keep earlier visible history out of the next provider request.

## Verification

Regression tests cover conversation boundaries, long-history limits, preference normalization, UTF-8 SSE parsing, reader cancellation, settings patch preservation, settings validation/authorization, prompt preferences, provider fallback/options, and endpoint truncation metadata/history opt-out. The production build includes TypeScript verification.

Live provider quality and authenticated administration require the deployed service credentials; local tests use controlled substitutes and do not establish production answer quality.

## November 16: developer identity and current website evidence

The approved `AIO for developers brand lockup.png` is used intact at `/brand/aio-for-developers.png` on the API landing, console (including signed-out access), API terms, changelog and admin developer page. A light contrast surface keeps the charcoal artwork readable in both themes. Shared chat rendering displays a trusted local logo/link card for developer-related completed, streamed and restored replies; user messages retain their normal rendering. No model-supplied image URL is required.

Static public knowledge now covers developer onboarding, manual credits, console controls, SDKs/webhooks/receipts, video guide, response budgets, pricing update, AuronixDirect, full-page AIO, notifications and status. Developer requests and relevant short follow-ups trigger retrieval. Current public prices are read from the same effective pricing configuration used by billing and supplied as current server evidence. Older canned developer/Amazon storefront answers are bypassed. No wallet, API secret, invoice or other private customer data is read to answer public pricing questions. AuronixDirect is distinguished from the separate affiliate discovery shop.
### Search activity

Chat shows all sources actually returned by retrieval in an expandable search activity panel. Each developer source uses the approved AIO for developers image instead of a text page title. Completed replies retain the checked sources. Home and the developer landing page are baseline checks whenever knowledge is enabled; other pages follow question relevance. Context is bounded by text size rather than a four-page display cap. The panel reports retrieval activity, not internal model reasoning.
