import { NextRequest, NextResponse } from "next/server";
import { getTickerSignal } from "@/lib/signals";
import { getWatchlist } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const wl = await getWatchlist();
  const meta = wl.find((t) => t.symbol === symbol);
  const signal = await getTickerSignal(symbol, meta?.name ?? symbol, meta?.sector ?? "—");
  return NextResponse.json(signal);
}
