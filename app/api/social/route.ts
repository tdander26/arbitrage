import { NextRequest, NextResponse } from "next/server";
import { getSocialVolume } from "@/lib/social";

export const dynamic = "force-dynamic";
// Apify runs can take ~20s; allow headroom on Vercel.
export const maxDuration = 30;

// GET /api/social?keyword=coconut+water
// Runs the Apify TikTok actor on demand for one keyword and returns a 0–100
// activity score. Requires APIFY_TOKEN; returns 503 with a clear message when
// it's unset so the UI can explain why.
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
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
