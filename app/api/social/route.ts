import { NextRequest, NextResponse } from "next/server";
import { startSocialRun } from "@/lib/social";
import { cleanKeyword } from "@/lib/validate";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/social?keyword=coconut+water
// Starts an Apify TikTok run and returns its runId immediately. The client
// then polls /api/social/status. Requires APIFY_TOKEN; returns 503 when unset.
export async function GET(req: NextRequest) {
  // Starting a run is the billable action — keep this rate limit tight.
  if (!(await rateLimit(`social:${clientKey(req)}`, 8, 60_000))) {
    return NextResponse.json(
      { runId: null, error: "Rate limited — try again shortly." },
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

  const runId = await startSocialRun(keyword);
  if (!runId) {
    return NextResponse.json(
      {
        runId: null,
        error:
          "Social volume unavailable. Set APIFY_TOKEN in the environment to enable TikTok data.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ runId });
}
