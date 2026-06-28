import { NextResponse } from "next/server";
import { SEED } from "@/lib/seed";
import { enrich } from "@/lib/enrich";
import { getNextEarnings } from "@/lib/earnings";
import type { EnrichedOpportunity, Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

// Overlay live Finnhub earnings onto a seeded opportunity when available.
async function withLiveEarnings(
  opp: Opportunity,
  now: Date,
): Promise<Opportunity> {
  const live = await getNextEarnings(opp.ticker, now);
  if (!live) return opp;
  return {
    ...opp,
    earningsDate: live.date,
    earningsTiming: live.timing ?? opp.earningsTiming,
    earningsTentative: live.tentative ?? opp.earningsTentative,
    estimateEps: live.estimateEps ?? opp.estimateEps,
  };
}

// Returns the tracked opportunities enriched with days-to-earnings and trend
// momentum, sorted so the most actionable (accelerating + near earnings) float
// to the top. Earnings dates come from Finnhub when FINNHUB_API_KEY is set,
// otherwise from the seed. Trend values use the seeded sample series; the live
// Google Trends series is fetched per-keyword via /api/trends.
export async function GET() {
  const now = new Date();

  const withEarnings = await Promise.all(
    SEED.map((o) => withLiveEarnings(o, now)),
  );

  const opportunities: EnrichedOpportunity[] = withEarnings
    .map((o) => enrich(o, o.sampleTrend, now))
    .sort((a, b) => {
      // Prioritize positive momentum, then proximity to earnings.
      if (b.momentum !== a.momentum) return b.momentum - a.momentum;
      return a.daysToEarnings - b.daysToEarnings;
    });

  const liveEarnings = Boolean(process.env.FINNHUB_API_KEY);

  return NextResponse.json({
    asOf: now.toISOString(),
    count: opportunities.length,
    earningsSource: liveEarnings ? "finnhub" : "seed",
    opportunities,
  });
}
