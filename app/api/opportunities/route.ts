import { NextResponse } from "next/server";
import { SEED } from "@/lib/seed";
import { enrich } from "@/lib/enrich";
import { getNextEarnings } from "@/lib/earnings";
import type { EnrichedOpportunity, Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

// Overlay live Finnhub earnings onto a seeded opportunity. Price is fetched
// on-demand (/api/quote) rather than here, to avoid a 2x Finnhub fan-out on
// every dashboard load that could trip the free-tier rate limit.
async function withLiveEarnings(
  opp: Opportunity,
  now: Date,
): Promise<{ opp: Opportunity; live: boolean }> {
  const live = await getNextEarnings(opp.ticker, now);
  if (!live) return { opp: { ...opp, earningsLive: false }, live: false };
  return {
    opp: {
      ...opp,
      earningsDate: live.date,
      earningsTiming: live.timing ?? opp.earningsTiming,
      earningsTentative: live.tentative ?? opp.earningsTentative,
      estimateEps: live.estimateEps ?? opp.estimateEps,
      earningsLive: true,
    },
    live: true,
  };
}

// Returns the tracked opportunities enriched with days-to-earnings and trend
// momentum. Earnings come from Finnhub when the key is set AND the call
// succeeds; earningsSource reflects what actually happened, not key presence.
export async function GET() {
  const now = new Date();

  const results = await Promise.all(SEED.map((o) => withLiveEarnings(o, now)));
  const liveCount = results.filter((r) => r.live).length;

  const opportunities: EnrichedOpportunity[] = results
    .map((r) => enrich(r.opp, r.opp.sampleTrend, now))
    .sort((a, b) => {
      if (b.momentum !== a.momentum) return b.momentum - a.momentum;
      return a.daysToEarnings - b.daysToEarnings;
    });

  // Honest provenance: "finnhub" only if at least one live fetch succeeded;
  // "degraded" when a key is set but every call fell back to seed dates.
  const keyed = Boolean(process.env.FINNHUB_API_KEY);
  const earningsSource = liveCount > 0 ? "finnhub" : keyed ? "degraded" : "seed";

  return NextResponse.json({
    asOf: now.toISOString(),
    count: opportunities.length,
    earningsSource,
    liveEarningsCount: liveCount,
    opportunities,
  });
}
