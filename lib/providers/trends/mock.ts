import type { TrendsProvider } from "@/lib/providers/types";
import { generateBundle } from "@/lib/providers/mock/generate";

export const mockTrendsProvider: TrendsProvider = {
  id: "mock",
  async getTrends(symbol) {
    return generateBundle(symbol).trends;
  },
};
