import { NextRequest, NextResponse } from "next/server";
import { getNextEarnings, getEarningsHistory } from "@/lib/earnings";
import { getTrend } from "@/lib/trends";
import { trendStats, daysBetween } from "@/lib/enrich";
import { beatRate, meaningfulBeatRate, computeSignal } from "@/lib/signal";
import { getQuote } from "@/lib/quote";
import { cleanTicker, cleanKeyword } from "@/lib/validate";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/score?ticker=NKE&keyword=nike&name=Nike
// Scores an arbitrary ticker the same way as the seeded names: real Finnhub
// earnings (next date + estimate) and beat history, live Google Trends for the
// keyword, and the composite Signal. Missing pieces degrade gracefully.
export async function GET(req: NextRequest) {
  // 3 upstream calls per request (2 Finnhub + 1 SerpApi) — keep this tight.
  if (!(await rateLimit(`score:${clientKey(req)}`, 12, 60_000))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const ticker = cleanTicker(req.nextUrl.searchParams.get("ticker"));
  const keyword = cleanKeyword(req.nextUrl.searchParams.get("keyword"));
  const name = req.nextUrl.searchParams.get("name")?.trim().slice(0, 40);

  if (!ticker || !keyword) {
    return NextResponse.json(
      { error: "valid ticker (1–8 letters) and keyword (1–60 chars) required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const [earnings, history, trend, price] = await Promise.all([
    getNextEarnings(ticker, now),
    getEarningsHistory(ticker),
    getTrend(keyword, []),
    getQuote(ticker),
  ]);

  const points = trend.points;
  const stats = trendStats(points);
  const beat = beatRate(history ?? undefined);
  const signal = computeSignal({
    momentumPct: stats.momentumPct,
    latest: stats.latest,
    beat: meaningfulBeatRate(history ?? undefined),
  });

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
    price: price ?? undefined,
    daysToEarnings: earnings ? daysBetween(now, earnings.date) : null,
    trend: { points, source: trend.source },
    latest: stats.latest,
    momentum: stats.momentum,
    momentumPct: stats.momentumPct,
    yoyPct: stats.yoyPct,
    isYoY: stats.isYoY,
    extended: stats.extended,
    beat,
    signal,
    // Provenance flags so the UI can be honest about what's real.
    earningsLive: Boolean(earnings),
    historyLive: Boolean(history),
  });
}
