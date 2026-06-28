import { NextResponse } from "next/server";
import { scanOpportunities } from "@/lib/arbitrage";
import { getQuotes } from "@/lib/feed";

// Always compute fresh on each request — no caching of the live feed.
export const dynamic = "force-dynamic";

export async function GET() {
  const quotes = getQuotes();
  const opportunities = scanOpportunities(quotes);

  return NextResponse.json({
    asOf: new Date().toISOString(),
    count: opportunities.length,
    opportunities,
  });
}
