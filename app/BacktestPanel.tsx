"use client";

import { useState } from "react";
import type { BtResult } from "@/lib/backtest";

type Resp = { asOf: string; namesUsed: number; result: BtResult };

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
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
  const edge =
    res && res.pos.n > 0 && res.neg.n > 0
      ? res.pos.beatRate - res.neg.beatRate
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
              <span className="bt-big">{pct(res.pos.beatRate)}</span>
              <span className="bt-sub">
                beat · avg surprise {signed(res.pos.avgSurprise)} · n={res.pos.n}
              </span>
            </div>
            <div className="bt-cell">
              <span className="bt-label">Flat / falling</span>
              <span className="bt-big">{pct(res.neg.beatRate)}</span>
              <span className="bt-sub">
                beat · avg surprise {signed(res.neg.avgSurprise)} · n={res.neg.n}
              </span>
            </div>
          </div>
          {edge !== null && (
            <p className="bt-verdict">
              {edge > 0.05
                ? `Directional edge: rising-search names beat ${Math.round(edge * 100)} pts more often.`
                : edge < -0.05
                  ? "No edge here — rising search did NOT beat more often in this sample."
                  : "Inconclusive — no meaningful difference in this small sample."}
            </p>
          )}
          <p className="disclaimer">
            Directional only — small sample, the anchor uses the fiscal-period
            date (±weeks of the real report), and search is a noisy proxy. The
            real test is the forward record your Positioned entries build over
            time.
          </p>
        </div>
      )}
    </details>
  );
}
