import { NextRequest, NextResponse } from "next/server";
import { getSocialVolume } from "@/lib/social";
import { cleanKeyword } from "@/lib/validate";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
// Apify TikTok runs can take 30–60s; use the max serverless budget.
export const maxDuration = 60;

// GET /api/social?keyword=coconut+water
// Runs the Apify TikTok actor on demand for one keyword and returns a 0–100
// activity score. Requires APIFY_TOKEN; returns 503 with a clear message when
// it's unset so the UI can explain why.
export async function GET(req: NextRequest) {
  // Apify runs are billable — tightest server-side limit of the three.
  if (!rateLimit(`social:${clientKey(req)}`, 8, 60_000)) {
    return NextResponse.json(
      { score: null, error: "Rate limited — try again shortly." },
      { status: 429 },
    );
  }
  const keyword = cleanKeyword(req.nextUrl.searchParams.get("keyword"));
  if (!keyword) {
    return NextResponse.json(
      { error: "valid keyword required (1–60 chars)" },
      { status: 400 },
    );
  }

  const result = await getSocialVolume(keyword);
  if (!result) {
    return NextResponse.json(
      {
        keyword,
        score: null,
        error:
          "Social volume unavailable. Set APIFY_TOKEN in the environment to enable TikTok data.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(result);
}
