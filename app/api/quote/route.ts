import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/quote";
import { cleanTicker } from "@/lib/validate";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/quote?ticker=NKE — current share price (on demand).
export async function GET(req: NextRequest) {
  if (!(await rateLimit(`quote:${clientKey(req)}`, 40, 60_000))) {
    return NextResponse.json({ price: null, error: "Rate limited" }, { status: 429 });
  }
  const ticker = cleanTicker(req.nextUrl.searchParams.get("ticker"));
  if (!ticker) {
    return NextResponse.json({ error: "valid ticker required" }, { status: 400 });
  }
  const price = await getQuote(ticker);
  return NextResponse.json({ ticker, price });
}
