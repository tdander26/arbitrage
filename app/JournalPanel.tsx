"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOverrides } from "./useOverrides";

type Pos = {
  ticker: string;
  date: string;
  entrySignal: number;
  entryPrice?: number;
  now?: number;
  ret?: number;
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
}
function signed1(n: number) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

// Your forward track record: every name you marked Positioned, with the live
// return since entry. This is the real, hindsight-free validation of the signal
// — it accrues as you use the tool.
export default function JournalPanel() {
  const { overrides } = useOverrides();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const positioned = useMemo(
    () =>
      Object.entries(overrides)
        .filter(([, o]) => o.status === "positioned" && o.entry)
        .map(([ticker, o]) => ({
          ticker,
          date: o.entry!.date,
          entrySignal: o.entry!.signal,
          entryPrice: o.entry!.price,
        })),
    [overrides],
  );

  // Fetch a current price for each position once.
  useEffect(() => {
    for (const p of positioned) {
      if (prices[p.ticker] != null || inFlight.current.has(p.ticker)) continue;
      inFlight.current.add(p.ticker);
      fetch(`/api/quote?ticker=${encodeURIComponent(p.ticker)}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.price === "number")
            setPrices((m) => ({ ...m, [p.ticker]: d.price }));
        })
        .catch(() => {})
        .finally(() => inFlight.current.delete(p.ticker));
    }
  }, [positioned, prices]);

  const rows: Pos[] = positioned.map((p) => {
    const now = prices[p.ticker];
    const ret =
      p.entryPrice && p.entryPrice > 0 && typeof now === "number"
        ? now / p.entryPrice - 1
        : undefined;
    return { ...p, now, ret };
  });

  const withRet = rows.filter((r) => typeof r.ret === "number") as (Pos & {
    ret: number;
  })[];
  const avg =
    withRet.length > 0
      ? withRet.reduce((s, r) => s + r.ret, 0) / withRet.length
      : null;
  const winRate =
    withRet.length > 0
      ? withRet.filter((r) => r.ret > 0).length / withRet.length
      : null;

  return (
    <details className="howto collapsible">
      <summary>Your track record ({positioned.length}) ▾</summary>

      {positioned.length === 0 ? (
        <p className="custom-status">
          No positions yet. Mark a name <em>Positioned</em> to capture its entry
          signal + price — your real, hindsight-free record builds from here.
        </p>
      ) : (
        <>
          <div className="baserates" style={{ border: "none" }}>
            <span>
              <strong>{positioned.length}</strong> positions
            </span>
            {avg !== null && (
              <span>
                avg return{" "}
                <strong className={avg >= 0 ? "pos" : "neg"}>
                  {signed1(avg)}
                </strong>
              </span>
            )}
            {winRate !== null && (
              <span>
                <strong>{Math.round(winRate * 100)}%</strong> winners
              </span>
            )}
          </div>
          <div className="table-wrap">
            <table className="journal-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Entered</th>
                  <th className="num">Entry sig</th>
                  <th className="num">Entry $</th>
                  <th className="num">Now $</th>
                  <th className="num">Return</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ticker}>
                    <td className="sym">{r.ticker}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td className="num">{r.entrySignal}</td>
                    <td className="num">
                      {r.entryPrice ? `$${r.entryPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className="num">
                      {typeof r.now === "number" ? `$${r.now.toFixed(2)}` : "…"}
                    </td>
                    <td
                      className={`num ${r.ret == null ? "" : r.ret >= 0 ? "pos" : "neg"}`}
                    >
                      {typeof r.ret === "number" ? signed1(r.ret) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="disclaimer">
            Returns are price-only since your entry date (Finnhub live quote),
            not total return, and the sample is whatever you&apos;ve logged.
            This is the validation that matters — it has no hindsight bias.
          </p>
        </>
      )}
    </details>
  );
}
