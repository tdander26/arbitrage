import { NextRequest, NextResponse } from "next/server";
import { getEarningsCalendarRange } from "@/lib/earnings";
import { getTrend } from "@/lib/trends";
import { getDailyCloses } from "@/lib/prices";
import { backtestName, aggregate, type BtRow } from "@/lib/backtest";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const revalidate = 3600;
export const maxDuration = 60;

// A broader universe that deliberately includes names with MIXED earnings
// records (not just serial beaters) to fight the survivorship bias that made
// the first cut look uninformative.
const NAMES = [
  { ticker: "COCO", keyword: "coconut water" },
  { ticker: "CELH", keyword: "celsius energy drink" },
  { ticker: "ELF", keyword: "elf cosmetics" },
  { ticker: "CROX", keyword: "crocs" },
  { ticker: "WING", keyword: "wingstop" },
  { ticker: "DECK", keyword: "hoka" },
  { ticker: "CAVA", keyword: "cava" },
  { ticker: "DUOL", keyword: "duolingo" },
  { ticker: "ONON", keyword: "on cloud shoes" },
  { ticker: "BROS", keyword: "dutch bros" },
  { ticker: "ULTA", keyword: "ulta" },
  // Mixed / frequent-miss records — reduce survivorship bias:
  { ticker: "PTON", keyword: "peloton" },
  { ticker: "W", keyword: "wayfair" },
  { ticker: "ETSY", keyword: "etsy" },
  { ticker: "CHWY", keyword: "chewy" },
  { ticker: "RIVN", keyword: "rivian" },
  { ticker: "BYND", keyword: "beyond meat" },
  { ticker: "RBLX", keyword: "roblox" },
  { ticker: "DASH", keyword: "doordash" },
  { ticker: "ABNB", keyword: "airbnb" },
];

export async function GET(req: NextRequest) {
  if (!(await rateLimit(`backtest:${clientKey(req)}`, 6, 60_000))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 1100 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const perName = await Promise.all(
    NAMES.map(async (n) => {
      const [history, trend, closes] = await Promise.all([
        getEarningsCalendarRange(n.ticker, from, to),
        getTrend(n.keyword, []),
        getDailyCloses(n.ticker),
      ]);
      if (!history || trend.source !== "live") {
        return { ticker: n.ticker, live: false, rows: [] as BtRow[] };
      }
      return {
        ticker: n.ticker,
        live: true,
        rows: backtestName(trend.points, history, closes ?? undefined),
      };
    }),
  );

  const rows = perName.flatMap((p) => p.rows);
  return NextResponse.json({
    asOf: now.toISOString(),
    namesUsed: perName.filter((p) => p.live && p.rows.length > 0).length,
    pricesAvailable: rows.some((r) => r.ret !== null),
    result: aggregate(rows),
  });
}
