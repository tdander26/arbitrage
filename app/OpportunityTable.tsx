"use client";

import { useCallback, useEffect, useState } from "react";
import type { Opportunity } from "@/lib/arbitrage";

type Feed = {
  asOf: string;
  count: number;
  opportunities: Opportunity[];
};

const REFRESH_MS = 4000;

function pct(n: number): string {
  return `${(n * 100).toFixed(3)}%`;
}

function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 5 : 2,
  });
}

export default function OpportunityTable() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

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
    if (!live) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, live]);

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <span className={`dot ${live ? "on" : "off"}`} />
          <strong>{feed?.count ?? 0}</strong> live opportunities
        </div>
        <div className="meta">
          {feed?.asOf && (
            <span>updated {new Date(feed.asOf).toLocaleTimeString()}</span>
          )}
          <button onClick={() => setLive((v) => !v)}>
            {live ? "Pause" : "Resume"}
          </button>
        </div>
      </header>

      {error && <p className="error">⚠ {error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Buy @</th>
              <th>Sell @</th>
              <th className="num">Buy price</th>
              <th className="num">Sell price</th>
              <th className="num">Gross</th>
              <th className="num">Net</th>
              <th className="num">Net / unit</th>
            </tr>
          </thead>
          <tbody>
            {feed?.opportunities.map((o) => (
              <tr key={o.symbol}>
                <td className="sym">{o.symbol}</td>
                <td>{o.buyVenue}</td>
                <td>{o.sellVenue}</td>
                <td className="num">{money(o.buyPrice)}</td>
                <td className="num">{money(o.sellPrice)}</td>
                <td className="num">{pct(o.grossPct)}</td>
                <td className={`num ${o.netPct > 0 ? "pos" : "neg"}`}>
                  {pct(o.netPct)}
                </td>
                <td className="num">{money(o.netProfit)}</td>
              </tr>
            ))}
            {feed && feed.opportunities.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No profitable spreads right now — fees outweigh the gap.
                </td>
              </tr>
            )}
            {!feed && !error && (
              <tr>
                <td colSpan={8} className="empty">
                  Scanning venues…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
