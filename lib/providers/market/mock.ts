import type { MarketProvider } from "@/lib/providers/types";
import { generateBundle } from "@/lib/providers/mock/generate";
import { getWatchlist } from "@/lib/watchlist";

export const mockMarketProvider: MarketProvider = {
  id: "mock",
  async getPriceSeries(symbol) {
    return generateBundle(symbol).price;
  },
  async getEarnings(symbol) {
    return generateBundle(symbol).earnings;
  },
  async getEarningsCalendar() {
    const wl = await getWatchlist();
    return wl.flatMap((t) => generateBundle(t.symbol).earnings);
  },
};
