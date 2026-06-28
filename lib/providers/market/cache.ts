import type { MarketProvider, PriceSeries, EarningsEvent } from "@/lib/providers/types";
import { readCache } from "@/lib/db/jsonStore";
import { mockMarketProvider } from "@/lib/providers/market/mock";
import { getWatchlist } from "@/lib/watchlist";

/**
 * Reads real market data seeded from Robinhood (scripts/seed-from-robinhood.ts)
 * out of data/cache. Falls back to the mock provider for any symbol that hasn't
 * been seeded yet, so the dashboard is never empty.
 */
export const cacheMarketProvider: MarketProvider = {
  id: "cache",
  async getPriceSeries(symbol) {
    const cached = await readCache<PriceSeries>(symbol, "price");
    if (cached && cached.points.length) return cached;
    return mockMarketProvider.getPriceSeries(symbol);
  },
  async getEarnings(symbol) {
    const cached = await readCache<EarningsEvent[]>(symbol, "earnings");
    if (cached && cached.length) return cached;
    return mockMarketProvider.getEarnings(symbol);
  },
  async getEarningsCalendar() {
    const wl = await getWatchlist();
    const all = await Promise.all(wl.map((t) => this.getEarnings(t.symbol)));
    return all.flat();
  },
};
