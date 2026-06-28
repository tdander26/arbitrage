import type { TrendsProvider, TrendsSeries } from "@/lib/providers/types";
import { readCache } from "@/lib/db/jsonStore";
import { mockTrendsProvider } from "@/lib/providers/trends/mock";

export const cacheTrendsProvider: TrendsProvider = {
  id: "cache",
  async getTrends(symbol) {
    const cached = await readCache<TrendsSeries>(symbol, "trends");
    if (cached && cached.points.length) return cached;
    return mockTrendsProvider.getTrends(symbol);
  },
};
