import { NextRequest, NextResponse } from "next/server";
import { getEarningsHistory } from "@/lib/earnings";
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

  // Finnhub's free /stock/earnings reliably returns dated historical EPS (the
  // /calendar endpoint is forward-only on free tier). Accurate historical
  // REPORT dates — needed to time a price-return measure — aren't available on
  // free data, so the deployed backtest validates EPS beats; the price-return
  // outcome is left to the forward journal (which captures entry price live).
  //
  // Fetched SEQUENTIALLY: SerpApi rejects a 20-wide concurrent burst (which
  // made most trends fall back to placeholder and get skipped). One-at-a-time
  // is slower but every name's trend actually loads. Cached 14d afterward.
  const perName: { ticker: string; live: boolean; rows: BtRow[] }[] = [];
  for (const n of NAMES) {
    const [history, trend] = await Promise.all([
      getEarningsHistory(n.ticker, 8),
      getTrend(n.keyword, []),
    ]);
    if (!history || trend.source !== "live") {
      perName.push({ ticker: n.ticker, live: false, rows: [] });
    } else {
      perName.push({
        ticker: n.ticker,
        live: true,
        rows: backtestName(trend.points, history),
      });
    }
  }

  const rows = perName.flatMap((p) => p.rows);
  return NextResponse.json({
    asOf: now.toISOString(),
    namesUsed: perName.filter((p) => p.live && p.rows.length > 0).length,
    pricesAvailable: false,
    result: aggregate(rows),
  });
}
