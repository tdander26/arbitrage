import { NextRequest, NextResponse } from "next/server";
import { getNextEarnings, getEarningsHistory } from "@/lib/earnings";
import { getTrend } from "@/lib/trends";
import { momentumOf, daysBetween } from "@/lib/enrich";
import { beatRate, computeSignal } from "@/lib/signal";

export const dynamic = "force-dynamic";

// GET /api/score?ticker=NKE&keyword=nike&name=Nike
// Scores an arbitrary ticker the same way as the seeded names: real Finnhub
// earnings (next date + estimate) and beat history, live Google Trends for the
// keyword, and the composite Signal. Missing pieces degrade gracefully.
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim();

  if (!ticker || !keyword) {
    return NextResponse.json(
      { error: "ticker and keyword are required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const [earnings, history, trend] = await Promise.all([
    getNextEarnings(ticker, now),
    getEarningsHistory(ticker),
    getTrend(keyword, []),
  ]);

  const points = trend.points;
  const { latest, momentum, momentumPct } = momentumOf(points);
  const beat = beatRate(history ?? undefined);
  const signal = computeSignal({ momentumPct, latest, beat });

  return NextResponse.json({
    ticker,
    company: name || ticker,
    product: name || keyword,
    keyword,
    category: "Custom",
    earningsDate: earnings?.date ?? null,
    earningsTiming: earnings?.timing,
    earningsTentative: earnings ? true : undefined,
    estimateEps: earnings?.estimateEps,
    epsHistory: history ?? undefined,
    daysToEarnings: earnings ? daysBetween(now, earnings.date) : null,
    trend: { points, source: trend.source },
    latest,
    momentum,
    momentumPct,
    beat,
    signal,
    // Provenance flags so the UI can be honest about what's real.
    earningsLive: Boolean(earnings),
    historyLive: Boolean(history),
  });
}
