"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ScoreBadge from "@/components/ScoreBadge";
import { fmtPrice, fmtPct, fmtDate } from "@/lib/format";
import type { MoverRow } from "@/lib/types-client";

async function fetchMovers(): Promise<MoverRow[]> {
  const r = await fetch("/api/movers");
  if (!r.ok) throw new Error("failed");
  return r.json();
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["movers"], queryFn: fetchMovers });
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/tickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name }),
      });
      if (!r.ok) throw new Error("add failed");
    },
    onSuccess: () => {
      setSymbol("");
      setName("");
      qc.invalidateQueries({ queryKey: ["movers"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: async (sym: string) => {
      await fetch(`/api/tickers?symbol=${encodeURIComponent(sym)}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movers"] }),
  });

  const rows = data ?? [];
  const top = rows[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <p className="text-sm text-muted">
          Tickers ranked by arbitrage score — social momentum + search trends + earnings proximity.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (symbol.trim()) addMut.mutate();
        }}
        className="flex flex-wrap gap-2 items-center"
      >
        <input
          className="input w-28 uppercase"
          placeholder="TICKER"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          className="input w-56"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={addMut.isPending}>
          {addMut.isPending ? "Adding…" : "+ Add ticker"}
        </button>
      </form>

      {top && (
        <Link href={`/ticker/${top.symbol}`} className="block card p-5 hover:bg-panelHover transition-colors">
          <div className="flex items-center gap-4">
            <ScoreBadge score={top.score} size="lg" />
            <div className="flex-1">
              <div className="text-xs text-warn font-medium uppercase tracking-wide">Top signal</div>
              <div className="text-lg font-semibold">
                {top.symbol} <span className="text-muted font-normal text-sm">{top.name}</span>
              </div>
              <div className="text-sm text-muted">
                {fmtPrice(top.latestPrice)}{" "}
                <span className={top.priceChangePct && top.priceChangePct >= 0 ? "text-bull" : "text-bear"}>
                  {fmtPct(top.priceChangePct)}
                </span>
                {top.nextEarnings && <span> · Earnings {fmtDate(top.nextEarnings.reportDate)}</span>}
              </div>
            </div>
          </div>
        </Link>
      )}

      {isLoading ? (
        <div className="text-muted">Loading signals…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((m) => (
            <div key={m.symbol} className="card p-4 hover:bg-panelHover transition-colors relative group">
              <button
                onClick={() => removeMut.mutate(m.symbol)}
                className="absolute top-2 right-2 text-muted hover:text-bear opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                title="Remove"
              >
                ✕
              </button>
              <Link href={`/ticker/${m.symbol}`} className="flex items-center gap-3">
                <ScoreBadge score={m.score} />
                <div className="min-w-0">
                  <div className="font-semibold">{m.symbol}</div>
                  <div className="text-xs text-muted truncate">{m.name}</div>
                </div>
              </Link>
              <div className="mt-3 flex justify-between text-sm">
                <span>{fmtPrice(m.latestPrice)}</span>
                <span className={m.priceChangePct && m.priceChangePct >= 0 ? "text-bull" : "text-bear"}>
                  {fmtPct(m.priceChangePct)}
                </span>
              </div>
              {m.nextEarnings && (
                <div className="mt-1 text-xs text-muted">
                  Next earnings {fmtDate(m.nextEarnings.reportDate)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
