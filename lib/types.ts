// Domain model for the social-arbitrage tracker.
//
// The thesis: a consumer product/brand goes vertical on social (TikTok virality,
// rising Google searches) months BEFORE that demand shows up in a public
// company's revenue. We watch the social signal in the run-up window and decide
// whether to position before the earnings date.

export type TrendPoint = {
  /** ISO date (month granularity is fine, e.g. "2026-01-01"). */
  date: string;
  /** Normalized interest 0–100, Google-Trends style. */
  value: number;
};

export type TrendSeries = {
  keyword: string;
  /** Where the numbers came from, so the UI can flag live vs. sample. */
  source: "live" | "sample";
  points: TrendPoint[];
};

export type Conviction = "low" | "medium" | "high";
export type Status = "watching" | "positioned" | "passed";

/** One reported quarter, for the EPS beat/miss track record. */
export type EpsQuarter = {
  /** Display label, e.g. "Q1 '26". */
  label: string;
  estimate: number;
  actual: number;
};

export type Opportunity = {
  ticker: string;
  company: string;
  /** The consumer product/brand whose social trend we're tracking. */
  product: string;
  /** Google Trends search term for the product. */
  keyword: string;
  category: string;
  /** Next earnings date (ISO). The deadline to have a view by. */
  earningsDate: string;
  /** Report timing on that date. */
  earningsTiming?: "am" | "pm";
  /** True when the date is estimated/unconfirmed by the company. */
  earningsTentative?: boolean;
  /** Consensus EPS estimate for the upcoming report. */
  estimateEps?: number;
  /** True when the earnings fields came from a successful live Finnhub call. */
  earningsLive?: boolean;
  /** Trailing reported quarters (oldest → newest) for beat/miss history. */
  epsHistory?: EpsQuarter[];
  conviction: Conviction;
  status: Status;
  notes: string;
  /** Seeded ~12-month trend used when no live feed is available. */
  sampleTrend: TrendPoint[];
  /**
   * Options snapshot around the next print: expected move (ATM straddle as a
   * fraction of spot) and ATM implied vol. A labeled point-in-time snapshot;
   * refreshed from a live options source rather than recomputed per request.
   */
  options?: { expectedMovePct: number; iv: number; asOf: string };
};

// Derived, request-time fields layered on top of an Opportunity.
export type EnrichedOpportunity = Opportunity & {
  daysToEarnings: number;
  /** Latest trend reading. */
  latest: number;
  /** Acceleration magnitude (YoY when available, else short-window). */
  momentum: number;
  /** Acceleration as a fraction; deseasonalized (YoY) when isYoY is true. */
  momentumPct: number;
  /** Year-over-year change, or null when history is too short. */
  yoyPct?: number | null;
  /** True when momentumPct is the deseasonalized YoY figure. */
  isYoY?: boolean;
  /** Latest near its trailing-12-month high — may already have run up. */
  extended?: boolean;
};
