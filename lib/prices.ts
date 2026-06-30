// Free daily price history from Stooq (no API key, works server-side). Used by
// the backtest to measure the actual POST-EARNINGS stock return — the outcome
// that matters, not just whether EPS beat. Returns null on any failure.

export type DailyClose = { date: string; close: number };

// Stooq symbol: us equities are "<ticker>.us", with . and - mapped to -.
function stooqSymbol(ticker: string): string {
  return ticker.toLowerCase().replace(/[.\-]/g, "-") + ".us";
}

export async function getDailyCloses(
  ticker: string,
): Promise<DailyClose[] | null> {
  const url = `https://stooq.com/q/d/l/?s=${stooqSymbol(ticker)}&i=d`;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 86400 }, // daily data — cache a day
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2 || !/^Date,/i.test(lines[0])) return null; // not CSV
    const out: DailyClose[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      // Date,Open,High,Low,Close,Volume
      const date = cols[0];
      const close = Number(cols[4]);
      if (date && Number.isFinite(close) && close > 0) out.push({ date, close });
    }
    return out.length ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}
