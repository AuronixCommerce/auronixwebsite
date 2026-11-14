export function summarizeUsage(rows: any[], days: number, now = Date.now()) {
  const first = new Date(now);
  first.setUTCHours(0, 0, 0, 0);
  first.setUTCDate(first.getUTCDate() - days + 1);
  const map = new Map<string, any>();
  for (let i = 0; i < days; i++) {
    const key = new Date(first.getTime() + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    map.set(key, {
      day: key,
      credits: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
      errors: 0,
      durationTotal: 0,
      durationCount: 0,
    });
  }
  const models: Record<string, any> = {},
    latencies: number[] = [];
  let charged = 0,
    input = 0,
    output = 0,
    errors = 0;
  for (const r of rows) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10),
      day = map.get(key);
    if (!day) continue;
    const units = Number(r.charged || 0),
      pi = Number(r.usage?.prompt_tokens || 0),
      po = Number(r.usage?.completion_tokens || 0),
      error = r.status !== "completed";
    day.credits += units / 1_000_000;
    day.inputTokens += pi;
    day.outputTokens += po;
    day.requests++;
    if (error) {
      day.errors++;
      errors++;
    }
    if (Number.isFinite(r.durationMs) && r.durationMs >= 0) {
      day.durationTotal += r.durationMs;
      day.durationCount++;
      latencies.push(r.durationMs);
    }
    charged += units;
    input += pi;
    output += po;
    const id = String(r.model || "unknown");
    models[id] ||= { model: id, requests: 0, credits: 0, errors: 0 };
    models[id].requests++;
    models[id].credits += units / 1_000_000;
    if (error) models[id].errors++;
  }
  latencies.sort((a, b) => a - b);
  return {
    days: Array.from(map.values()).map((d) => ({
      ...d,
      averageMs: d.durationCount
        ? Math.round(d.durationTotal / d.durationCount)
        : null,
    })),
    models: Object.values(models),
    totals: {
      requests: Array.from(map.values()).reduce((s, d) => s + d.requests, 0),
      errors,
      chargedUnits: charged,
      inputTokens: input,
      outputTokens: output,
      averageMs: latencies.length
        ? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length)
        : null,
      p95Ms: latencies.length
        ? latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)]
        : null,
    },
    period: {
      from: first.toISOString(),
      to: new Date(now).toISOString(),
      timezone: "UTC",
    },
  };
}
