# AIO Node.js starter

Requires Node.js 20.6+. No npm packages are needed.

1. Obtain approved developer access and prepaid credits at https://auronixcommerce.com/aio/developers/console.
2. Copy `.env.example` to `.env` (`cp .env.example .env`, or `copy .env.example .env` on Windows).
3. Set your private `AIO_API_KEY` and choose an allowed model. Keep `.env` out of source control.
4. Run `npm start` or `npm start -- "Your question"`.

Every successful text request is metered against your account wallet. API errors do not automatically retry. After a timeout, check Usage before submitting a new request. The same Idempotency-Key prevents duplicate processing for 24 hours; answers are not replayed.

## Webhooks

Set `AIO_WEBHOOK_SECRET` in `.env`, run `npm run webhook`, and expose the local `/aio-webhook` handler through your own public HTTPS hostname on port 443. Configure that HTTPS URL in the developer console. Do not expose `.env` or the API key.

The receiver verifies `AIO-Webhook-Timestamp`, then compares `AIO-Webhook-Signature` against `v1=` plus HMAC-SHA256 of `<timestamp>.<exact raw request body>` using the full `whsec_...` secret. It rejects timestamps outside five minutes and checks `AIO-Webhook-Id` against the event body. Never parse and reserialize JSON before signature verification.

Events: `payment.approved`, `balance.low`, and user-triggered `endpoint.test`. Deliveries may repeat. Replace the demonstration in-memory ID cache with durable deduplication and a transactional/outbox handler before production use. Acknowledge only after durable acceptance. A webhook is a notification about your AIO wallet, not authorization to bypass your own application’s security.

Docs: https://auronixcommerce.com/aio/developers
Terms: https://auronixcommerce.com/aio/developers/terms
Changelog: https://auronixcommerce.com/aio/developers/changelog
