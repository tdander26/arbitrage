/**
 * Seed real market data from Robinhood into data/cache.
 *
 * WHY A NORMALIZER, NOT A DIRECT FETCH: the Robinhood data is exposed through
 * an MCP server that is available to the *agent* (Claude Code), not to a plain
 * Node process or a deployed app. So the flow is two steps:
 *
 *   1. In a Claude Code session, ask Claude to fetch, for each watchlist symbol:
 *        - get_equity_historicals(symbol, interval="day", ~90d range)
 *        - get_earnings_results(symbol)
 *      and save each raw MCP response verbatim to:
 *        data/raw/<SYMBOL>.historicals.json
 *        data/raw/<SYMBOL>.earnings.json
 *
 *   2. Run `npm run seed`. This script reads those raw dumps, normalizes them to
 *      the app's cache shape, and writes:
 *        data/cache/<SYMBOL>.price.json      (PriceSeries)
 *        data/cache/<SYMBOL>.earnings.json   (EarningsEvent[])
 *
 * With MARKET_PROVIDER=cache (the default), the dashboard then serves real
 * prices/earnings for seeded symbols and falls back to mock for the rest.
 *
 * The parsers below are defensive: Robinhood/MCP response shapes vary, so we
 * probe a few common field names rather than hard-coding one schema.
 */

import { promises as fs } from "fs";
import path from "path";
import { getWatchlist } from "../lib/watchlist";
import type { PriceSeries, EarningsEvent } from "../lib/providers/types";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "data", "raw");
const CACHE_DIR = path.join(ROOT, "data", "cache");

async function readRaw(file: string): Promise<any | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function asArray(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (!x || typeof x !== "object") return [];
  // MCP responses often wrap rows under results/data/historicals/items.
  for (const k of ["results", "data", "historicals", "items", "bars", "earnings"]) {
    if (Array.isArray(x[k])) return x[k];
  }
  // Some return { results: [{ historicals: [...] }] }
  if (Array.isArray(x.results) && x.results[0]?.historicals) return x.results[0].historicals;
  return [];
}

function pick(o: any, keys: string[]): any {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return o[k];
  return undefined;
}

function toDate(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizePrice(symbol: string, raw: any): PriceSeries | null {
  const rows = asArray(raw);
  const points = rows
    .map((r) => {
      const t = toDate(pick(r, ["begins_at", "date", "timestamp", "t", "time"]));
      const close = Number(pick(r, ["close_price", "close", "c", "adjusted_close", "value"]));
      return t && isFinite(close) ? { t, value: Math.round(close * 100) / 100 } : null;
    })
    .filter((x): x is { t: string; value: number } => x !== null);
  if (!points.length) return null;
  return { symbol, source: "robinhood", points };
}

function normalizeEarnings(symbol: string, raw: any): EarningsEvent[] {
  const rows = asArray(raw);
  return rows
    .map((r): EarningsEvent | null => {
      const reportDate = toDate(pick(r, ["report_date", "date", "reportDate", "report?.date"]) ?? r.report?.date);
      if (!reportDate) return null;
      const est = pick(r, ["eps_estimate", "estimate", "epsEstimate"]) ?? r.eps?.estimate ?? r.estimate?.eps;
      const act = pick(r, ["eps_actual", "actual", "epsActual"]) ?? r.eps?.actual ?? r.actual?.eps;
      const timingRaw = String(pick(r, ["timing", "report_timing", "time"]) ?? r.report?.timing ?? "").toLowerCase();
      const time = timingRaw.includes("am") || timingRaw === "bmo" ? "bmo" : timingRaw.includes("pm") || timingRaw === "amc" ? "amc" : "unknown";
      const estN = est == null ? null : Number(est);
      const actN = act == null ? null : Number(act);
      const surprisePct = estN && actN ? Math.round(((actN - estN) / Math.abs(estN)) * 1000) / 10 : null;
      return {
        symbol,
        reportDate,
        time: time as EarningsEvent["time"],
        epsEstimate: estN != null && isFinite(estN) ? estN : null,
        epsActual: actN != null && isFinite(actN) ? actN : null,
        surprisePct,
      };
    })
    .filter((x): x is EarningsEvent => x !== null)
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

async function main() {
  const wl = await getWatchlist();
  await fs.mkdir(CACHE_DIR, { recursive: true });
  let seeded = 0;
  let missing = 0;

  for (const t of wl) {
    const sym = t.symbol.toUpperCase();
    const histRaw = await readRaw(path.join(RAW_DIR, `${sym}.historicals.json`));
    const earnRaw = await readRaw(path.join(RAW_DIR, `${sym}.earnings.json`));

    if (!histRaw && !earnRaw) {
      console.log(`· ${sym}: no raw dumps found, skipping (will use mock)`);
      missing++;
      continue;
    }

    if (histRaw) {
      const price = normalizePrice(sym, histRaw);
      if (price) {
        await fs.writeFile(path.join(CACHE_DIR, `${sym}.price.json`), JSON.stringify(price, null, 2));
        console.log(`✓ ${sym}: ${price.points.length} price points`);
      } else {
        console.log(`! ${sym}: could not parse historicals`);
      }
    }
    if (earnRaw) {
      const earnings = normalizeEarnings(sym, earnRaw);
      if (earnings.length) {
        await fs.writeFile(path.join(CACHE_DIR, `${sym}.earnings.json`), JSON.stringify(earnings, null, 2));
        console.log(`✓ ${sym}: ${earnings.length} earnings rows`);
      }
    }
    seeded++;
  }

  console.log(`\nDone. Seeded ${seeded} symbol(s); ${missing} without raw dumps (using mock).`);
  if (missing === wl.length) {
    console.log(
      "\nNo raw dumps found. In a Claude Code session, ask Claude to fetch\n" +
        "get_equity_historicals + get_earnings_results for each watchlist symbol\n" +
        "and save them to data/raw/<SYMBOL>.historicals.json / .earnings.json, then re-run.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
