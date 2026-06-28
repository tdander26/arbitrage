import type { MarketProvider, TrendsProvider, SocialProvider } from "@/lib/providers/types";
import { mockMarketProvider } from "@/lib/providers/market/mock";
import { cacheMarketProvider } from "@/lib/providers/market/cache";
import { mockTrendsProvider } from "@/lib/providers/trends/mock";
import { cacheTrendsProvider } from "@/lib/providers/trends/cache";
import { mockSocialProvider } from "@/lib/providers/social/mock";
import { cacheSocialProvider } from "@/lib/providers/social/cache";

/**
 * Selects the active provider per layer from env vars. Swapping a data source
 * is a one-line env change — no UI or scoring code changes.
 *
 *   MARKET_PROVIDER = mock | cache   (cache = real data seeded from Robinhood)
 *   TRENDS_PROVIDER = mock | cache
 *   SOCIAL_PROVIDER = mock | cache
 *
 * Future live providers (googleTrendsMcp, reddit, finnhub) register here.
 */

const market: Record<string, MarketProvider> = {
  mock: mockMarketProvider,
  cache: cacheMarketProvider,
};
const trends: Record<string, TrendsProvider> = {
  mock: mockTrendsProvider,
  cache: cacheTrendsProvider,
};
const social: Record<string, SocialProvider> = {
  mock: mockSocialProvider,
  cache: cacheSocialProvider,
};

export function marketProvider(): MarketProvider {
  return market[process.env.MARKET_PROVIDER ?? "cache"] ?? cacheMarketProvider;
}
export function trendsProvider(): TrendsProvider {
  return trends[process.env.TRENDS_PROVIDER ?? "cache"] ?? cacheTrendsProvider;
}
export function socialProvider(): SocialProvider {
  return social[process.env.SOCIAL_PROVIDER ?? "cache"] ?? cacheSocialProvider;
}
