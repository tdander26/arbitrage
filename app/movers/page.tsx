"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ScoreBadge from "@/components/ScoreBadge";
import { fmtPrice, fmtPct, fmtDate } from "@/lib/format";
import type { MoverRow } from "@/lib/types-client";

async function fetchMovers(): Promise<MoverRow[]> {
  const r = await fetch("/api/movers");
  if (!r.ok) throw new Error("failed");
  return r.json();
}

export default function MoversPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["movers"],
    queryFn: fetchMovers,
    refetchInterval: 60_000,
  });
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Movers</h1>
        <p className="text-sm text-muted">
          Where attention is accelerating — ranked by composite arbitrage score.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-border">
                <th className="font-normal p-3">#</th>
                <th className="font-normal p-3">Score</th>
                <th className="font-normal p-3">Ticker</th>
                <th className="font-normal p-3">Social</th>
                <th className="font-normal p-3">Search</th>
                <th className="font-normal p-3 text-right">Price</th>
                <th className="font-normal p-3 text-right">Δ</th>
                <th className="font-normal p-3">Next earnings</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.symbol} className="border-b border-border hover:bg-panelHover transition-colors">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3">
                    <ScoreBadge score={m.score} size="sm" />
                  </td>
                  <td className="p-3">
                    <Link href={`/ticker/${m.symbol}`} className="hover:text-accent">
                      <span className="font-semibold">{m.symbol}</span>
                      <span className="text-muted text-xs block">{m.name}</span>
                    </Link>
                  </td>
                  <td className="p-3 tabular-nums text-muted">{Math.round(m.components.socialMomentum)}</td>
                  <td className="p-3 tabular-nums text-muted">{Math.round(m.components.trendsMomentum)}</td>
                  <td className="p-3 text-right tabular-nums">{fmtPrice(m.latestPrice)}</td>
                  <td
                    className={`p-3 text-right tabular-nums ${
                      m.priceChangePct && m.priceChangePct >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {fmtPct(m.priceChangePct)}
                  </td>
                  <td className="p-3 text-muted">
                    {m.nextEarnings ? fmtDate(m.nextEarnings.reportDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
