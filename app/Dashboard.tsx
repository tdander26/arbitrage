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
                </span>
                <span className={`conv ${o.conviction}`}>{o.conviction}</span>
              </div>
            </article>
          );
        })}
      </div>

      <p className="provenance">
        Trend values shown are seeded samples. Live Google Trends is available at{" "}
        <code>/api/trends?keyword=…</code>; connect an earnings API and a social
        provider (Apify) to make every column live — see the README.
      </p>
    </section>
  );
}
