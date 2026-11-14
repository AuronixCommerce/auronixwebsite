export const API_RELEASES = [
  {
    id: "2026-11-14",
    version: "API v1 · 2026-11-14",
    date: "2026-11-14",
    title: "Developer controls and integrations",
    type: "release",
    body: "Added account-wide daily and monthly spending limits, low-balance email alerts, model/IP/expiry restrictions for API keys, usage charts with errors and latency, approved-payment PDF receipts, signed payment and low-balance webhooks, and downloadable Node.js/Python starter projects. The AIO developer video is available on the API page and in the guide library. Existing API keys keep their previous model access unless you edit their restrictions.",
  },
  {
    id: "2026-11-13",
    version: "API v1 · 2026-11-13",
    date: "2026-11-13",
    title: "AIO developer platform launch",
    type: "release",
    body: "Introduced email-verified developer applications, admin-reviewed API access, multiple API keys, a shared prepaid wallet, metered text generation, manual payment instructions and approval, API Terms, and the live text playground. Supported aliases: aio-one, aio-2, aio-2-fast. Streaming, images, tools, and audio are not supported by this API version.",
  },
];
export function parseNotice(b: any) {
  const title = typeof b.title === "string" ? b.title.trim() : "",
    version = typeof b.version === "string" ? b.version.trim() : "",
    body = typeof b.body === "string" ? b.body.trim() : "",
    type = b.type;
  const effectiveAt = b.effectiveAt === null ? null : Number(b.effectiveAt);
  if (
    title.length < 3 ||
    title.length > 160 ||
    !version ||
    version.length > 60 ||
    body.length < 10 ||
    body.length > 4000 ||
    !["update", "model", "deprecation", "maintenance"].includes(type) ||
    typeof b.published !== "boolean" ||
    (effectiveAt !== null &&
      (!Number.isSafeInteger(effectiveAt) || effectiveAt < 1))
  )
    throw Error(
      "Enter a title, version, notice text, valid type, and effective date.",
    );
  return { title, version, body, type, published: b.published, effectiveAt };
}
