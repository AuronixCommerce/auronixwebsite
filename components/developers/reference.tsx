"use client";
import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
const samples = {
  cURL: `curl https://auronixcommerce.com/api/aio/v1/chat/completions \\\n  -H "Authorization: Bearer $AIO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: order-summary-001" \\\n  -d '{
    "model": "aio-2-fast",
    "messages": [{"role": "user", "content": "Explain wholesale sourcing."}],
    "max_completion_tokens": 512
  }'`,
  JavaScript: `// Server-side only. Keep your API key out of browser code.
const response = await fetch(
  "https://auronixcommerce.com/api/aio/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.AIO_API_KEY}\`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({
      model: "aio-2-fast",
      messages: [{ role: "user", content: "Explain wholesale sourcing." }],
      max_completion_tokens: 512
    })
  }
);
const result = await response.json();
if (!response.ok) throw new Error(result.error.message);
console.log(result.choices[0].message.content, result.billing);`,
  Python: `# Server-side only. pip install requests
import os, uuid, requests
response = requests.post(
    "https://auronixcommerce.com/api/aio/v1/chat/completions",
    headers={
        "Authorization": "Bearer " + os.environ["AIO_API_KEY"],
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json={
        "model": "aio-2-fast",
        "messages": [{"role": "user", "content": "Explain wholesale sourcing."}],
        "max_completion_tokens": 512,
    },
    timeout=60,
)
response.raise_for_status()
print(response.json()["choices"][0]["message"]["content"])`,
};
export function DeveloperReference({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<keyof typeof samples>("cURL"),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(samples[language]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Select and copy the code below.");
    }
  }
  return (
    <div className="dev-reference" id={compact ? undefined : "api-reference"}>
      <div className="dev-code-toolbar">
        <div role="group" aria-label="Code language">
          {Object.keys(samples).map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={language === x}
              onClick={() => setLanguage(x as keyof typeof samples)}
            >
              {x}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{samples[language]}</code>
      </pre>
      {error && <p role="status">{error}</p>}
      {!compact && (
        <div className="dev-docs">
          <h3>One endpoint. Three AIO modes.</h3>
          <p>
            POST <code>/api/aio/v1/chat/completions</code> accepts text messages
            with <code>system</code>, <code>user</code>, or{" "}
            <code>assistant</code> roles. GET <code>/api/aio/v1/models</code>{" "}
            lists the available AIO aliases. Both require an approved account
            and a valid Bearer API key.
          </p>
          <div className="dev-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Accepted values</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>model</td>
                  <td>aio-one · aio-2 · aio-2-fast</td>
                </tr>
                <tr>
                  <td>messages</td>
                  <td>1–32 text messages; 16 KB combined input</td>
                </tr>
                <tr>
                  <td>max_completion_tokens</td>
                  <td>1–4,096; default 512. max_tokens is an alternative.</td>
                </tr>
                <tr>
                  <td>temperature</td>
                  <td>0–2; default 0.5</td>
                </tr>
                <tr>
                  <td>stream</td>
                  <td>
                    false. Streaming, tools, images, and files are not supported
                    in v1.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3>Predictable billing</h3>
          <p>
            Prepaid credits use manual payment approval: request credits, wait
            for team payment instructions, submit your transfer reference, then
            an admin verifies the actual received payment before adding credits.
            Live console tests are metered at the same rates.{" "}
            <Link href="/aio/developers/terms">
              Read the API Terms and payment policy.
            </Link>
          </p>
          <p>
            1 credit = 1,000,000 internal units. Input and output tokens have
            separate published rates per 1,000 tokens. A request first reserves
            its maximum cost. Only provider-reported token usage from a
            successful response is charged, rounded up to whole units separately
            for input and output; the rest is released. Reasoning tokens count
            toward the provider’s output usage. Your response includes token
            counts and credit units charged.
          </p>
          <p>
            All keys share the same wallet and account request limit, with up to
            five in-flight requests. Reusing an <code>Idempotency-Key</code>{" "}
            within 24 hours returns 409 instead of generating or charging twice.
            Responses are not replayed. After a timeout, check console usage
            before using a new key. Failed requests release their holds;
            interrupted holds expire after two minutes and are recovered on the
            next wallet or API request.
          </p>
          <h3>Errors &amp; access</h3>
          <p>
            401: invalid key · 402: insufficient credits · 403: unapproved or
            suspended account · 409: duplicate request · 429: account limit ·
            502: provider failure · 503: API paused or unavailable. A
            non-success response has <code>error.message</code> and{" "}
            <code>error.type</code>. Use <code>X-Request-ID</code> from
            successful responses when asking support about a charge.
          </p>
          <p>
            AIO modes route to Auronix’s configured upstream model provider. API
            prompts are processed by that provider; don’t send passwords,
            verification codes, or sensitive personal information. The usage
            ledger stores metadata and token counts, not your prompts or
            answers. Store your API key on your server.
          </p>
        </div>
      )}
    </div>
  );
}
