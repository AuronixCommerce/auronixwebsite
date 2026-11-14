"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { developerFetch } from "./client";
import { credits } from "@/lib/developers/model";
export default function DeveloperAnalytics() {
  const [days, setDays] = useState(30),
    [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    developerFetch("analytics?days=" + days)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [days]);
  const axis = { fontSize: 10, fill: "hsl(var(--foreground-muted))" },
    tip = {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 10,
      fontSize: 11,
      color: "hsl(var(--foreground))",
    };
  return (
    <section className="dev-card dev-section">
      <div className="dev-section-title">
        <div>
          <span className="dev-kicker">UTC USAGE ANALYTICS</span>
          <h2>Understand every request.</h2>
        </div>
        <label className="dev-select-label">
          Period
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>
      {error && (
        <div className="dev-alert dev-error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <p className="dev-empty">Loading usage charts…</p>
      ) : (
        <>
          <div className="dev-stat-grid">
            <div className="dev-card">
              <span>Credits used</span>
              <strong>{credits(data.totals.chargedUnits)}</strong>
              <small>
                {data.totals.requests} requests · {data.totals.errors} errors
              </small>
            </div>
            <div className="dev-card">
              <span>Input / output tokens</span>
              <strong className="dev-token-total">
                {data.totals.inputTokens.toLocaleString()} /{" "}
                {data.totals.outputTokens.toLocaleString()}
              </strong>
              <small>Provider-reported billable tokens</small>
            </div>
            <div className="dev-card">
              <span>Average / p95 processing time</span>
              <strong className="dev-token-total">
                {data.totals.averageMs === null
                  ? "—"
                  : data.totals.averageMs + "ms"}{" "}
                / {data.totals.p95Ms === null ? "—" : data.totals.p95Ms + "ms"}
              </strong>
              <small>Requests with timing metadata</small>
            </div>
          </div>
          {data.truncated && (
            <div className="dev-alert">
              Charts show the latest 10,000 requests in this period. Your
              enforced daily/monthly spending totals remain exact.
            </div>
          )}
          <div className="dev-chart-grid">
            <article>
              <h3>Daily spending · credits</h3>
              <div
                className="dev-chart"
                role="img"
                aria-label="Daily API spending in credits"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.days}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={axis}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={axis} />
                    <Tooltip contentStyle={tip} />
                    <Bar
                      dataKey="credits"
                      name="Credits"
                      fill="#91bd62"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article>
              <h3>Token usage</h3>
              <div
                className="dev-chart"
                role="img"
                aria-label="Daily input and output token usage"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.days}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={axis}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={axis} />
                    <Tooltip contentStyle={tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="inputTokens"
                      name="Input"
                      stackId="tokens"
                      fill="#91bd62"
                    />
                    <Bar
                      dataKey="outputTokens"
                      name="Output"
                      stackId="tokens"
                      fill="#6a89a9"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article>
              <h3>Requests &amp; errors</h3>
              <div
                className="dev-chart"
                role="img"
                aria-label="Daily request and error totals"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.days}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={axis}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={axis} allowDecimals={false} />
                    <Tooltip contentStyle={tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      name="Requests"
                      stroke="#91bd62"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="errors"
                      name="Errors"
                      stroke="#cf7474"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article>
              <h3>Average request processing · ms</h3>
              <div
                className="dev-chart"
                role="img"
                aria-label="Average daily API request processing time in milliseconds"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.days}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={axis}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={axis} />
                    <Tooltip contentStyle={tip} />
                    <Line
                      type="monotone"
                      dataKey="averageMs"
                      name="Average ms"
                      stroke="#6a89a9"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
          <details className="dev-webhook-docs">
            <summary>Accessible daily data table</summary>
            <div className="dev-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Day (UTC)</th>
                    <th>Credits</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Requests</th>
                    <th>Errors</th>
                    <th>Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d: any) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.credits.toFixed(6)}</td>
                      <td>{d.inputTokens}</td>
                      <td>{d.outputTokens}</td>
                      <td>{d.requests}</td>
                      <td>{d.errors}</td>
                      <td>{d.averageMs ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="dev-fine">
            Failed, rejected, and expired requests count as errors.
            Unauthenticated requests cannot be attributed to an account. Older
            records without timing metadata are excluded from latency averages.
            Processing time is measured through model generation, before
            notification delivery.
          </p>
        </>
      )}
    </section>
  );
}
