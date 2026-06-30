// Live stock price via Finnhub /quote (free tier). Used to capture an entry
// price when a name is marked Positioned and to show return-since-entry.
// Returns null when no key or the call fails. Cached briefly to avoid hammering
// the rate limit when many cards load.

export async function getQuote(symbol: string): Promise<number | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    symbol,
  )}&token=${key}`;

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 300 }, // 5-minute cache
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { c?: number };
    // c = current price; Finnhub returns 0 for unknown symbols.
    return typeof json.c === "number" && json.c > 0 ? json.c : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}
