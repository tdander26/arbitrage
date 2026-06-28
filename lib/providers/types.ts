import { z } from "zod";

/**
 * The contract every data source implements. The UI and scoring layers only
 * ever talk to these shapes, so a mock source, a cached-from-Robinhood source,
 * or a live web API are interchangeable behind the registry.
 */

export const TimeSeriesPoint = z.object({
  t: z.string(), // ISO date (YYYY-MM-DD)
  value: z.number(),
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPoint>;

export const Ticker = z.object({
  symbol: z.string(),
  name: z.string(),
  sector: z.string().default("—"),
  watchedAt: z.string().optional(),
});
export type Ticker = z.infer<typeof Ticker>;

export const PriceSeries = z.object({
  symbol: z.string(),
  source: z.string(),
  points: z.array(TimeSeriesPoint), // daily close
});
export type PriceSeries = z.infer<typeof PriceSeries>;

export const TrendsSeries = z.object({
  symbol: z.string(),
  keyword: z.string(),
  source: z.string(),
  points: z.array(TimeSeriesPoint), // 0-100 search interest
});
export type TrendsSeries = z.infer<typeof TrendsSeries>;

export const SocialPoint = z.object({
  t: z.string(),
  mentions: z.number(),
  sentiment: z.number().optional(), // -1..1
});
export type SocialPoint = z.infer<typeof SocialPoint>;

export const SocialSeries = z.object({
  symbol: z.string(),
  source: z.string(), // 'reddit' | 'stocktwits' | 'mock'
  points: z.array(SocialPoint),
});
export type SocialSeries = z.infer<typeof SocialSeries>;

export const EarningsEvent = z.object({
  symbol: z.string(),
  reportDate: z.string(), // ISO date
  time: z.enum(["bmo", "amc", "unknown"]).default("unknown"),
  epsEstimate: z.number().nullable().optional(),
  epsActual: z.number().nullable().optional(),
  surprisePct: z.number().nullable().optional(),
});
export type EarningsEvent = z.infer<typeof EarningsEvent>;

export const ScoreComponents = z.object({
  socialMomentum: z.number(),
  trendsMomentum: z.number(),
  correlation: z.number(),
  earningsProximity: z.number(),
});
export type ScoreComponents = z.infer<typeof ScoreComponents>;

export const ArbitrageScore = z.object({
  symbol: z.string(),
  t: z.string(),
  score: z.number(), // 0-100
  components: ScoreComponents,
  weights: ScoreComponents,
});
export type ArbitrageScore = z.infer<typeof ArbitrageScore>;

/** Provider interfaces. */
export interface MarketProvider {
  id: string;
  getPriceSeries(symbol: string): Promise<PriceSeries | null>;
  getEarnings(symbol: string): Promise<EarningsEvent[]>;
  getEarningsCalendar(): Promise<EarningsEvent[]>;
}

export interface TrendsProvider {
  id: string;
  getTrends(symbol: string): Promise<TrendsSeries | null>;
}

export interface SocialProvider {
  id: string;
  getSocial(symbol: string): Promise<SocialSeries | null>;
}
