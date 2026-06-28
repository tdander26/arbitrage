import { NextResponse } from "next/server";
import { getAllSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

/** Watchlist ranked by arbitrage score — the "something's happening here" feed. */
export async function GET() {
  const signals = await getAllSignals();
  const movers = signals
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      score: s.score.score,
      components: s.score.components,
      latestPrice: s.latestPrice,
      priceChangePct: s.priceChangePct,
      nextEarnings: s.nextEarnings,
    }))
    .sort((a, b) => b.score - a.score);
  return NextResponse.json(movers);
}
