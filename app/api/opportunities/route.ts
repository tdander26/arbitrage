import { NextResponse } from "next/server";
import { SEED } from "@/lib/seed";
import { enrich } from "@/lib/enrich";
import type { EnrichedOpportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

// Returns the tracked opportunities enriched with days-to-earnings and trend
// momentum, sorted so the most actionable (accelerating + near earnings) float
// to the top. Trend values here come from the seeded sample series; the live
// Google Trends series is fetched per-keyword via /api/trends.
export async function GET() {
  const now = new Date();

  const opportunities: EnrichedOpportunity[] = SEED.map((o) =>
    enrich(o, o.sampleTrend, now),
  ).sort((a, b) => {
    // Prioritize positive momentum, then proximity to earnings.
    if (b.momentum !== a.momentum) return b.momentum - a.momentum;
    return a.daysToEarnings - b.daysToEarnings;
  });

  return NextResponse.json({
    asOf: now.toISOString(),
    count: opportunities.length,
    opportunities,
  });
}
