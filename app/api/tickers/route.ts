import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, addTicker, removeTicker } from "@/lib/watchlist";
import { Ticker } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getWatchlist());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Ticker.partial({ sector: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }
  const list = await addTicker({
    symbol: parsed.data.symbol,
    name: parsed.data.name || parsed.data.symbol.toUpperCase(),
    sector: parsed.data.sector || "—",
  });
  return NextResponse.json(list);
}

export async function DELETE(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  return NextResponse.json(await removeTicker(symbol));
}
