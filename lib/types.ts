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
  /** Trailing reported quarters (oldest → newest) for beat/miss history. */
  epsHistory?: EpsQuarter[];
  conviction: Conviction;
  status: Status;
  notes: string;
  /** Seeded ~12-month trend used when no live feed is available. */
  sampleTrend: TrendPoint[];
};

// Derived, request-time fields layered on top of an Opportunity.
export type EnrichedOpportunity = Opportunity & {
  daysToEarnings: number;
  /** Latest trend reading. */
  latest: number;
  /** avg(last 3 months) − avg(prior 3 months); positive = accelerating. */
  momentum: number;
  /** momentum as a % of the prior-3-month average. */
  momentumPct: number;
};
