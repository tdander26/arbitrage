// Financial Modeling Prep provider — the one source that gives BOTH accurate
// historical earnings REPORT dates and daily prices on a free tier, which is
// what the price-return backtest needs (Finnhub free lacks report dates; the
// keyless Stooq endpoint is blocked from serverless). Key-gated: set
// FMP_API_KEY (free at https://site.financialmodelingprep.com). Never throws.

import type { DailyClose } from "./prices";

const BASE = "https://financialmodelingprep.com/api/v3";

async function fetchJson<T>(url: string, ms = 6000): Promise<T | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 86400 }, // daily-grain data; cache a day
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

type FmpEarning = {
  date: string; // actual report date
  eps: number | null;
  epsEstimated: number | null;
};

/** Historical earnings with REAL report dates (+ EPS), or null. */
export async function getFmpEarnings(
  symbol: string,
): Promise<{ date: string; estimate: number; actual: number }[] | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const rows = await fetchJson<FmpEarning[]>(
    `${BASE}/historical/earning_calendar/${encodeURIComponent(symbol)}?apikey=${key}`,
  );
  if (!Array.isArray(rows)) return null;
  const out = rows
    .filter((r) => r.eps != null && r.epsEstimated != null && r.date)
    .map((r) => ({
      date: r.date.slice(0, 10),
      estimate: r.epsEstimated as number,
      actual: r.eps as number,
    }));
  return out.length ? out : null;
}

type FmpPrice = { historical?: { date: string; close: number }[] };

/** Daily closes ascending, or null. */
export async function getFmpDailyCloses(
  symbol: string,
): Promise<DailyClose[] | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const data = await fetchJson<FmpPrice>(
    `${BASE}/historical-price-full/${encodeURIComponent(symbol)}?serietype=line&apikey=${key}`,
  );
  const hist = data?.historical;
  if (!Array.isArray(hist) || hist.length === 0) return null;
  // FMP returns most-recent first — sort ascending for the return calc.
  return hist
    .filter((h) => h.date && Number.isFinite(h.close) && h.close > 0)
    .map((h) => ({ date: h.date.slice(0, 10), close: h.close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
