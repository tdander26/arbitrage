import { NextRequest, NextResponse } from "next/server";
import { getSocialRun } from "@/lib/social";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/social/status?runId=...
// Polls a previously-started Apify run. Returns { status: pending|done|failed }.
export async function GET(req: NextRequest) {
  // Polling is cheap (status reads, not billable runs) but bound it anyway.
  if (!(await rateLimit(`socialstatus:${clientKey(req)}`, 120, 60_000))) {
    return NextResponse.json({ status: "failed" }, { status: 429 });
  }
  const runId = req.nextUrl.searchParams.get("runId");
  if (!runId || !/^[A-Za-z0-9]{6,40}$/.test(runId)) {
    return NextResponse.json({ error: "valid runId required" }, { status: 400 });
  }

  const result = await getSocialRun(runId);
  return NextResponse.json(result);
}
