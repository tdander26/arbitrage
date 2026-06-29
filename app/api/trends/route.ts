import { NextRequest, NextResponse } from "next/server";
import { getTrend } from "@/lib/trends";
import { SEED } from "@/lib/seed";
import { cleanKeyword } from "@/lib/validate";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/trends?keyword=coconut+water
// Returns a 12-month interest-over-time series for the keyword. Tries live
// Google Trends and falls back to the seeded sample series (matched by keyword)
// so the endpoint always returns usable data, flagged with its source.
export async function GET(req: NextRequest) {
  if (!(await rateLimit(`trends:${clientKey(req)}`, 40, 60_000))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const keyword = cleanKeyword(req.nextUrl.searchParams.get("keyword"));
  if (!keyword) {
    return NextResponse.json(
      { error: "valid keyword required (1–60 chars)" },
      { status: 400 },
    );
  }

  const seed = SEED.find(
    (o) => o.keyword.toLowerCase() === keyword.toLowerCase(),
  );
  const fallback = seed?.sampleTrend ?? [];

  const series = await getTrend(keyword, fallback);
  return NextResponse.json(series);
}
