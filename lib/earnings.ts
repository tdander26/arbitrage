// Earnings-date provider. When FINNHUB_API_KEY is set the deployed app pulls
// the next confirmed/estimated earnings date per ticker from Finnhub; otherwise
// it uses the seeded dates (which were sourced from real data). Never throws —
// returns null on any miss so callers fall back to the seed.
//
// Get a free key at https://finnhub.io and add it in Vercel:
//   Settings → Environment Variables → FINNHUB_API_KEY

type EarningsInfo = {
  date: string; // ISO
  timing?: "am" | "pm";
  estimateEps?: number;
  tentative?: boolean;
};

const BASE = "https://finnhub.io/api/v1/calendar/earnings";

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

type FinnhubRow = {
  date: string;
  hour?: string; // "bmo" | "amc" | ""
  epsEstimate?: number | null;
  symbol: string;
};

function mapTiming(hour?: string): "am" | "pm" | undefined {
  if (hour === "bmo") return "am";
  if (hour === "amc") return "pm";
  return undefined;
}

/**
 * Next upcoming earnings for a symbol from Finnhub, or null if unavailable.
 * Looks 90 days ahead and returns the soonest report.
 */
export async function getNextEarnings(
  symbol: string,
  now: Date,
): Promise<EarningsInfo | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;

  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 180 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const url = `${BASE}?from=${from}&to=${to}&symbol=${encodeURIComponent(
    symbol,
  )}&token=${key}`;

  try {
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return null;
    const json = (await res.json()) as { earningsCalendar?: FinnhubRow[] };
    const rows = (json.earningsCalendar ?? [])
      .filter((r) => r.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date));
    const next = rows[0];
    if (!next) return null;
    return {
      date: next.date,
      timing: mapTiming(next.hour),
      estimateEps: next.epsEstimate ?? undefined,
      tentative: true,
    };
  } catch {
    return null;
  }
}

type FinnhubEarning = {
  actual: number | null;
  estimate: number | null;
  period: string; // YYYY-MM-DD
  quarter: number;
  year: number;
};

/**
 * Trailing reported quarters for a symbol from Finnhub (oldest → newest),
 * used to compute beat-rate for custom tickers. Null if unavailable.
 */
export async function getEarningsHistory(
  symbol: string,
  limit = 4,
): Promise<{ label: string; estimate: number; actual: number }[] | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;

  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(
    symbol,
  )}&token=${key}`;

  try {
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return null;
    const rows = (await res.json()) as FinnhubEarning[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    // Finnhub returns most-recent first; keep rows with both values.
    const usable = rows
      .filter((r) => r.actual != null && r.estimate != null)
      .slice(0, limit)
      .reverse();
    if (usable.length === 0) return null;
    return usable.map((r) => ({
      label: `Q${r.quarter} '${String(r.year).slice(2)}`,
      estimate: r.estimate as number,
      actual: r.actual as number,
    }));
  } catch {
    return null;
  }
}
