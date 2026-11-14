# AIO Python starter

Requires Python 3.9+. Uses only the standard library; no pip packages are needed.

1. Obtain an approved, funded developer account: https://auronixcommerce.com/aio/developers/console.
2. Copy `.env.example` to `.env` and add your private API key. Never commit `.env` or put the key in browser code.
3. Run `python example.py` or `python example.py "Your question"`.

Successful requests use your prepaid credits. No automatic retries are performed. After a timeout, check console Usage before sending a new request. A repeated Idempotency-Key prevents duplicate processing for 24 hours but does not replay the answer.

## Webhooks

Set `AIO_WEBHOOK_SECRET` and run `python webhook.py`. Expose its local `/aio-webhook` route through your own public HTTPS hostname on port 443 and configure that URL in the console. The local HTTP server is a development receiver, not a production TLS deployment.

The receiver verifies the HMAC-SHA256 signature over `<AIO-Webhook-Timestamp>.<exact raw request body>` with your complete `whsec_...` signing secret, checks a five-minute timestamp window, and confirms the event ID header matches the body. Never verify a reserialized JSON body.

Events: `payment.approved`, `balance.low`, and user-triggered `endpoint.test`. Deliveries may repeat. Replace the in-memory deduplication cache with durable event storage and a transactional business handler before production use. Acknowledge only after durable acceptance. Never use a webhook to bypass application authorization.

Docs: https://auronixcommerce.com/aio/developers
Terms: https://auronixcommerce.com/aio/developers/terms
Changelog: https://auronixcommerce.com/aio/developers/changelog
