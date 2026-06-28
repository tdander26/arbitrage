"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ScoreBadge from "@/components/ScoreBadge";
import { fmtPct, fmtDate } from "@/lib/format";
import type { EarningsRow } from "@/lib/types-client";

async function fetchEarnings(): Promise<EarningsRow[]> {
  const r = await fetch("/api/earnings");
  if (!r.ok) throw new Error("failed");
  return r.json();
}

export default function EarningsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["earnings"], queryFn: fetchEarnings });
  const rows = data ?? [];
  const upcoming = rows.filter((r) => r.daysUntil >= 0);
  const past = rows.filter((r) => r.daysUntil < 0).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Earnings calendar</h1>
        <p className="text-sm text-muted">
          Upcoming reports cross-referenced with current arbitrage score — high score
          + imminent earnings is the setup to watch.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <>
          <Section title="Upcoming" rows={upcoming} highlight />
          <Section title="Recent (thesis check)" rows={past} />
        </>
      )}
    </div>
  );
}

function Section({ title, rows, highlight }: { title: string; rows: EarningsRow[]; highlight?: boolean }) {
  if (!rows.length) return null;
  return (
    <div>
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="font-normal p-3">Score</th>
              <th className="font-normal p-3">Ticker</th>
              <th className="font-normal p-3">Date</th>
              <th className="font-normal p-3">When</th>
              <th className="font-normal p-3">{highlight ? "In" : "Surprise"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.symbol + e.reportDate + i} className="border-b border-border hover:bg-panelHover">
                <td className="p-3">
                  <ScoreBadge score={e.score} size="sm" />
                </td>
                <td className="p-3">
                  <Link href={`/ticker/${e.symbol}`} className="hover:text-accent">
                    <span className="font-semibold">{e.symbol}</span>
                    <span className="text-muted text-xs block">{e.name}</span>
                  </Link>
                </td>
                <td className="p-3">{fmtDate(e.reportDate)}</td>
                <td className="p-3 uppercase text-xs text-muted">{e.time}</td>
                <td className="p-3">
                  {highlight ? (
                    <span className={e.daysUntil <= 7 ? "text-warn" : "text-muted"}>
                      {e.daysUntil === 0 ? "today" : `${e.daysUntil}d`}
                    </span>
                  ) : (
                    <span
                      className={
                        e.surprisePct == null ? "text-muted" : e.surprisePct >= 0 ? "text-bull" : "text-bear"
                      }
                    >
                      {e.surprisePct == null ? "—" : fmtPct(e.surprisePct)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
