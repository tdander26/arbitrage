"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EnrichedOpportunity, Status } from "@/lib/types";
import Sparkline from "./Sparkline";

type Feed = {
  asOf: string;
  count: number;
  opportunities: EnrichedOpportunity[];
};

type SortKey = "momentum" | "earnings" | "interest";

const STATUS_LABEL: Record<Status, string> = {
  watching: "Watching",
  positioned: "Positioned",
  passed: "Passed",
};

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;
}

// On-demand TikTok activity score. Calls Apify (via /api/social) only when the
// user clicks, so we don't burn Apify credits on every page load.
function TikTokScore({ keyword }: { keyword: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "done" | "unavailable"
  >("idle");
  const [score, setScore] = useState<number | null>(null);

  async function check() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/social?keyword=${encodeURIComponent(keyword)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || data.score == null) {
        setState("unavailable");
        return;
      }
      setScore(data.score);
      setState("done");
    } catch {
      setState("unavailable");
    }
  }

  if (state === "done")
    return <span className="tiktok done">TikTok {score}/100</span>;
  if (state === "unavailable")
    return (
      <span className="tiktok off" title="Set APIFY_TOKEN to enable">
        TikTok n/a
      </span>
    );

  return (
    <button
      className="tiktok btn"
      onClick={check}
      disabled={state === "loading"}
    >
      {state === "loading" ? "checking…" : "check TikTok"}
    </button>
  );
}

export default function Dashboard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("momentum");
  const [hideStatus, setHideStatus] = useState<Set<Status>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeed(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!feed) return [];
    const filtered = feed.opportunities.filter((o) => !hideStatus.has(o.status));
    const sorted = [...filtered];
    if (sort === "momentum") sorted.sort((a, b) => b.momentum - a.momentum);
    if (sort === "earnings")
      sorted.sort((a, b) => a.daysToEarnings - b.daysToEarnings);
    if (sort === "interest") sorted.sort((a, b) => b.latest - a.latest);
    return sorted;
  }, [feed, sort, hideStatus]);

  function toggleStatus(s: Status) {
    setHideStatus((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <strong>{rows.length}</strong> opportunities
        </div>
        <div className="controls">
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="momentum">Trend momentum</option>
              <option value="earnings">Days to earnings</option>
              <option value="interest">Current interest</option>
            </select>
          </label>
          <div className="chips">
            {(["watching", "positioned", "passed"] as Status[]).map((s) => (
              <button
                key={s}
                className={`chip ${hideStatus.has(s) ? "off" : "on"}`}
                onClick={() => toggleStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <p className="error">⚠ {error}</p>}

      <div className="cards">
        {rows.map((o) => {
          const soon = o.daysToEarnings <= 30;
          return (
            <article key={o.ticker} className="card">
              <div className="card-main">
                <div className="ident">
                  <span className="ticker">{o.ticker}</span>
                  <span className="company">{o.company}</span>
                  <span className={`status ${o.status}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                <div className="product">
                  <span className="dot-trend" /> {o.product}
                  <span className="cat">{o.category}</span>
                </div>
                <p className="notes">{o.notes}</p>

                {o.epsHistory && o.epsHistory.length > 0 && (
                  <div className="track">
                    <span className="track-label">EPS vs est</span>
                    {o.epsHistory.map((q) => {
                      const beat = q.actual >= q.estimate;
                      return (
                        <span
                          key={q.label}
                          className={`pill ${beat ? "beat" : "miss"}`}
                          title={`${q.label}: actual ${q.actual} vs est ${q.estimate}`}
                        >
                          {q.label.split(" ")[0]} {beat ? "▲" : "▼"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card-trend">
                <Sparkline points={o.sampleTrend} />
                <div className="trend-stats">
                  <span
                    className={`mom ${o.momentum >= 0 ? "pos" : "neg"}`}
                    title="Recent 3-mo avg vs. prior 3-mo avg"
                  >
                    {signedPct(o.momentumPct)} momentum
                  </span>
                  <span className="interest">interest {o.latest}/100</span>
                  <TikTokScore keyword={o.keyword} />
                </div>
              </div>

              <div className="card-earn">
                <span className={`countdown ${soon ? "soon" : ""}`}>
                  {o.daysToEarnings}d
                </span>
                <span className="earn-label">
                  to earnings
                  <br />
                  {fmtDate(o.earningsDate)}
                  {o.earningsTiming ? ` ${o.earningsTiming}` : ""}
                  {o.earningsTentative ? "*" : ""}
                  {typeof o.estimateEps === "number" && (
                    <>
                      <br />
                      est EPS ${o.estimateEps.toFixed(2)}
                    </>
                  )}
                </span>
                <span className={`conv ${o.conviction}`}>{o.conviction}</span>
              </div>
            </article>
          );
        })}
      </div>

      <p className="provenance">
        Earnings dates, EPS estimates and beat/miss history are real (verified
        market data); <code>*</code> marks a tentative date. Trend values are
        seeded samples — live Google Trends is at{" "}
        <code>/api/trends?keyword=…</code>. Set <code>FINNHUB_API_KEY</code> to
        auto-refresh earnings and <code>APIFY_TOKEN</code> for TikTok volume —
        see the README.
      </p>
    </section>
  );
}
