import { NextRequest, NextResponse } from "next/server";
import { getTrend } from "@/lib/trends";
import { SEED } from "@/lib/seed";

export const dynamic = "force-dynamic";

// GET /api/trends?keyword=coconut+water
// Returns a 12-month interest-over-time series for the keyword. Tries live
// Google Trends and falls back to the seeded sample series (matched by keyword)
// so the endpoint always returns usable data, flagged with its source.
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  const seed = SEED.find(
    (o) => o.keyword.toLowerCase() === keyword.toLowerCase(),
  );
  const fallback = seed?.sampleTrend ?? [];

  const series = await getTrend(keyword, fallback);
  return NextResponse.json(series);
}
