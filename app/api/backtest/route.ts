import { NextRequest, NextResponse } from "next/server";
import { getEarningsHistory } from "@/lib/earnings";
import { getFmpEarnings, getFmpDailyCloses } from "@/lib/fmp";
import { getTrend } from "@/lib/trends";
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

  // When FMP_API_KEY is set we get REAL report dates + daily prices → the
  // price-return outcome. Otherwise we fall back to Finnhub's /stock/earnings
  // (dated by fiscal period) and validate EPS beats only.
  const useFmp = Boolean(process.env.FMP_API_KEY);

  // Fetched SEQUENTIALLY: SerpApi rejects a 20-wide concurrent burst (which
  // made most trends fall back to placeholder and get skipped). One-at-a-time
  // is slower but every name's trend actually loads. Cached afterward.
  const perName: { ticker: string; live: boolean; rows: BtRow[] }[] = [];
  for (const n of NAMES) {
    const [history, closes, trend] = await Promise.all([
      useFmp ? getFmpEarnings(n.ticker) : getEarningsHistory(n.ticker, 8),
      useFmp ? getFmpDailyCloses(n.ticker) : Promise.resolve(null),
      getTrend(n.keyword, []),
    ]);
    if (!history || trend.source !== "live") {
      perName.push({ ticker: n.ticker, live: false, rows: [] });
    } else {
      perName.push({
        ticker: n.ticker,
        live: true,
        rows: backtestName(trend.points, history, closes ?? undefined),
      });
    }
  }

  const rows = perName.flatMap((p) => p.rows);
  return NextResponse.json({
    asOf: now.toISOString(),
    namesUsed: perName.filter((p) => p.live && p.rows.length > 0).length,
    pricesAvailable: rows.some((r) => r.ret !== null),
    result: aggregate(rows),
  });
}
