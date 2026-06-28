import { NextRequest, NextResponse } from "next/server";
import { marketProvider, trendsProvider, socialProvider } from "@/lib/providers/registry";
import { computeScore } from "@/lib/score/arbitrageScore";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const [price, trends, social, earnings] = await Promise.all([
    marketProvider().getPriceSeries(symbol),
    trendsProvider().getTrends(symbol),
    socialProvider().getSocial(symbol),
    marketProvider().getEarnings(symbol),
  ]);
  return NextResponse.json(computeScore(symbol, social, trends, price, earnings));
}
