"use client";

import { useState } from "react";
import type { BtResult } from "@/lib/backtest";

type Resp = {
  asOf: string;
  namesUsed: number;
  pricesAvailable: boolean;
  result: BtResult;
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}
function signed1(n: number) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

// Validation harness, loaded on demand (its upstream calls aren't cheap).
export default function BacktestPanel() {
  const [data, setData] = useState<Resp | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function load() {
    if (data || state === "loading") return;
    setState("loading");
    try {
      const r = await fetch("/api/backtest", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setState("idle");
    } catch {
      setState("error");
    }
  }

  const res = data?.result;
  // The real edge: difference in post-earnings RETURN, rising vs flat search.
  const retEdge =
    res && res.pos.retN > 0 && res.neg.retN > 0
      ? res.pos.avgReturn - res.neg.avgReturn
      : null;

  return (
    <details className="howto collapsible" onToggle={(e) => e.currentTarget.open && load()}>
      <summary>Does the signal actually work? (validation) ▾</summary>

      {state === "loading" && <p className="custom-status">Crunching history…</p>}
      {state === "error" && (
        <p className="custom-status err">
          Couldn&apos;t run the backtest (needs FINNHUB_API_KEY + live Google
          Trends).
        </p>
      )}

      {res && (
        <div className="bt">
          <p className="bt-head">
            Across <strong>{res.n}</strong> past earnings (from{" "}
            {data?.namesUsed} names with live search history): when YoY search
            momentum was <em>rising</em> into the print vs. flat/falling.
          </p>
          <div className="bt-grid">
            <div className="bt-cell good">
              <span className="bt-label">Rising search</span>
              <span className="bt-big">
                {data?.pricesAvailable ? signed1(res.pos.avgReturn) : pct(res.pos.beatRate)}
              </span>
              <span className="bt-sub">
                {data?.pricesAvailable
                  ? `avg 1wk return · ${pct(res.pos.upRate)} up · beat ${pct(res.pos.beatRate)} · n=${res.pos.n}`
                  : `beat · surprise ${signed(res.pos.avgSurprise)} · n=${res.pos.n}`}
              </span>
            </div>
            <div className="bt-cell">
              <span className="bt-label">Flat / falling</span>
              <span className="bt-big">
                {data?.pricesAvailable ? signed1(res.neg.avgReturn) : pct(res.neg.beatRate)}
              </span>
              <span className="bt-sub">
                {data?.pricesAvailable
                  ? `avg 1wk return · ${pct(res.neg.upRate)} up · beat ${pct(res.neg.beatRate)} · n=${res.neg.n}`
                  : `beat · surprise ${signed(res.neg.avgSurprise)} · n=${res.neg.n}`}
              </span>
            </div>
          </div>
          {retEdge !== null && (
            <p className="bt-verdict">
              {retEdge > 0.005
                ? `Edge: rising-search names returned ${signed1(retEdge)} more in the week after earnings.`
                : retEdge < -0.005
                  ? "No edge — rising search did NOT lead to better post-earnings returns in this sample."
                  : "Inconclusive — no meaningful return difference in this sample."}
            </p>
          )}
          <p className="disclaimer">
            {data?.pricesAvailable
              ? "Post-earnings return = report-day close → ~5 trading days later (Stooq), using the real report date. "
              : ""}
            Still directional — ~{data?.namesUsed} names, a few years of history,
            search is noisy, and a 1-week window misses longer drift. The
            definitive test is the forward record your Positioned entries build.
          </p>
        </div>
      )}
    </details>
  );
}
