import { NextRequest, NextResponse } from "next/server";
import { getEarningsHistory } from "@/lib/earnings";
import { getTrend } from "@/lib/trends";
import { backtestName, aggregate, type BtRow } from "@/lib/backtest";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

// A fixed, well-covered set of names to validate against. Kept small to bound
// upstream calls; trend/history are cached so repeat loads are cheap.
const NAMES = [
  { ticker: "COCO", keyword: "coconut water" },
  { ticker: "CELH", keyword: "celsius energy drink" },
  { ticker: "ELF", keyword: "elf cosmetics" },
  { ticker: "CROX", keyword: "crocs" },
  { ticker: "WING", keyword: "wingstop" },
  { ticker: "DECK", keyword: "hoka" },
  { ticker: "CAVA", keyword: "cava" },
  { ticker: "DUOL", keyword: "duolingo" },
];

// GET /api/backtest — directional validation across the fixed name set.
export async function GET(req: NextRequest) {
  if (!(await rateLimit(`backtest:${clientKey(req)}`, 6, 60_000))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const perName = await Promise.all(
    NAMES.map(async (n) => {
      const [history, trend] = await Promise.all([
        getEarningsHistory(n.ticker, 8),
        getTrend(n.keyword, []),
      ]);
      // Only use real, live trend history — placeholder data must not pollute.
      if (!history || trend.source !== "live") {
        return { ticker: n.ticker, live: false, rows: [] as BtRow[] };
      }
      return {
        ticker: n.ticker,
        live: true,
        rows: backtestName(trend.points, history),
      };
    }),
  );

  const rows = perName.flatMap((p) => p.rows);
  return NextResponse.json({
    asOf: new Date().toISOString(),
    namesUsed: perName.filter((p) => p.live && p.rows.length > 0).length,
    result: aggregate(rows),
  });
}
