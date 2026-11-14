const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const { createHmac } = require("node:crypto");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const runtime = (language) =>
  language === "node" ? process.execPath : "python3";
function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (x) => (stdout += x));
    child.stderr.on("data", (x) => (stderr += x));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
for (const language of ["node", "python"])
  test(`${language} starter sends a real local HTTP request and reports provider-shaped tokens and charges`, async () => {
    let captured;
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (x) => (raw += x));
      req.on("end", () => {
        captured = {
          headers: req.headers,
          body: JSON.parse(raw),
          path: req.url,
        };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "aio-local-test",
            choices: [{ message: { content: "Local integration response" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
            },
            billing: { charged_units: 100, units_per_credit: 1000000 },
          }),
        );
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const port = server.address().port,
        script = path.join(
          root,
          "examples",
          "aio-" + language,
          language === "node" ? "example.mjs" : "example.py",
        );
      const result = await run(runtime(language), [script], {
        AIO_API_KEY: "aio_live_test_only_not_a_real_secret",
        AIO_BASE_URL: `http://127.0.0.1:${port}/api/aio/v1`,
        AIO_MODEL: "aio-2-fast",
      });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Local integration response/);
      assert.match(result.stdout, /Credits charged:/);
      assert.equal(captured.path, "/api/aio/v1/chat/completions");
      assert.equal(captured.body.model, "aio-2-fast");
      assert.match(captured.headers["idempotency-key"], /^[a-f0-9-]{36}$/);
      assert.equal(
        result.stdout.includes("aio_live_test_only_not_a_real_secret"),
        false,
      );
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
for (const language of ["node", "python"])
  test(
    `${language} webhook example rejects forged/stale signatures and deduplicates verified IDs`,
    { timeout: 10000 },
    async () => {
      const probe = http.createServer();
      await new Promise((r) => probe.listen(0, "127.0.0.1", r));
      const port = probe.address().port;
      await new Promise((r) => probe.close(r));
      const secret = "whsec_unit_test_only_signing_secret",
        script = path.join(
          root,
          "examples",
          "aio-" + language,
          language === "node" ? "webhook.mjs" : "webhook.py",
        );
      const child = spawn(runtime(language), [script], {
        cwd: root,
        env: {
          ...process.env,
          AIO_WEBHOOK_SECRET: secret,
          PORT: String(port),
          PYTHONUNBUFFERED: "1",
        },
      });
      let stdout = "";
      child.stdout.on("data", (x) => (stdout += x));
      child.stderr.on("data", () => {});
      try {
        for (let attempt = 0; attempt < 60; attempt++) {
          try {
            await fetch(`http://127.0.0.1:${port}/ready`);
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 20));
          }
        }
        const raw = JSON.stringify({
            id: "evt_test_001",
            type: "endpoint.test",
            data: { message: "Local test" },
          }),
          timestamp = String(Math.floor(Date.now() / 1000));
        const send = (t, signature) =>
          fetch(`http://127.0.0.1:${port}/aio-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "AIO-Webhook-Id": "evt_test_001",
              "AIO-Webhook-Timestamp": t,
              "AIO-Webhook-Signature": signature,
            },
            body: raw,
          });
        const sign = (t) =>
          "v1=" +
          createHmac("sha256", secret)
            .update(t + "." + raw)
            .digest("hex");
        assert.equal(
          (await send(timestamp, "v1=" + "0".repeat(64))).status,
          401,
        );
        assert.equal(
          (
            await send(
              String(Number(timestamp) - 900),
              sign(String(Number(timestamp) - 900)),
            )
          ).status,
          401,
        );
        assert.equal((await send(timestamp, sign(timestamp))).status, 200);
        assert.equal((await send(timestamp, sign(timestamp))).status, 200);
        await new Promise((r) => setTimeout(r, 25));
        assert.equal((stdout.match(/Verified AIO event:/g) || []).length, 1);
      } finally {
        child.kill("SIGTERM");
      }
    },
  );
test("download ZIPs match source files and contain placeholders rather than real environment files", () => {
  const script =
    "from zipfile import ZipFile\nfrom pathlib import Path\nroot=Path.cwd()\nfor lang in ['node','python']:\n with ZipFile(root/'public'/'downloads'/('aio-'+lang+'-starter.zip')) as z:\n  assert z.testzip() is None\n  assert any(n.endswith('/.env.example') for n in z.namelist())\n  for name in z.namelist():\n   relative=name.split('/',1)[1]\n   assert '..' not in relative and relative != '.env'\n   assert z.read(name)==(root/'examples'/('aio-'+lang)/relative).read_bytes()\nprint('Archive sources verified')";
  const result = spawnSync("python3", ["-c", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified/);
});
