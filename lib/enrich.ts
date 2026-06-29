import type { EnrichedOpportunity, Opportunity, TrendPoint } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function daysBetween(from: Date, toIso: string): number {
  const to = new Date(toIso + "T00:00:00Z");
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type TrendStats = {
  latest: number;
  /** Acceleration used for ranking/signal — YoY when available, else short. */
  momentum: number;
  momentumPct: number;
  /** Year-over-year change (deseasonalized), or null when history is short. */
  yoyPct: number | null;
  /** True when momentumPct is the deseasonalized YoY figure. */
  isYoY: boolean;
  /** Latest is near its trailing-12-month high — may already have run up. */
  extended: boolean;
};

/**
 * Trend statistics that prefer a DESEASONALIZED year-over-year change over a
 * raw recent-vs-prior comparison. Seasonal names (coconut water, gyms in
 * January) ramp every year; YoY isolates genuine change. Falls back to a short
 * acceleration when there isn't a full year of history (e.g. seeded samples).
 */
export function trendStats(points: TrendPoint[]): TrendStats {
  const vals = points.map((p) => p.value);
  const n = vals.length;
  const latest = vals[n - 1] ?? 0;

  // Short acceleration: smoothed recent vs the window just before it.
  let shortPct = 0;
  if (n >= 8) {
    const a = avg(vals.slice(-4));
    const b = avg(vals.slice(-8, -4));
    shortPct = b > 0 ? (a - b) / b : 0;
  } else if (n >= 6) {
    const a = avg(vals.slice(-3));
    const b = avg(vals.slice(-6, -3));
    shortPct = b > 0 ? (a - b) / b : 0;
  }

  // Year-over-year: ~52 weekly points back. Needs >~13 months of data.
  let yoyPct: number | null = null;
  if (n >= 56) {
    const recent = avg(vals.slice(-4));
    const yearAgo = avg(vals.slice(-56, -48));
    if (yearAgo > 0) yoyPct = (recent - yearAgo) / yearAgo;
  }

  const isYoY = yoyPct !== null;
  const momentumPct = isYoY ? (yoyPct as number) : shortPct;

  // "Extended": latest sits near the top of its trailing-year range.
  const window = vals.slice(-52);
  const maxW = window.length ? Math.max(...window) : latest;
  const extended = window.length >= 20 && maxW > 0 && latest / maxW >= 0.95;

  return {
    latest,
    momentum: momentumPct * 100,
    momentumPct,
    yoyPct,
    isYoY,
    extended,
  };
}

/** Back-compat: short recent-vs-prior momentum (used for seeded sample data). */
export function momentumOf(points: TrendPoint[]): TrendStats {
  return trendStats(points);
}

/** Layer request-time derived fields onto an opportunity using a trend series. */
export function enrich(
  opp: Opportunity,
  points: TrendPoint[],
  now: Date,
): EnrichedOpportunity {
  const s = trendStats(points);
  return {
    ...opp,
    daysToEarnings: daysBetween(now, opp.earningsDate),
    latest: s.latest,
    momentum: s.momentum,
    momentumPct: s.momentumPct,
    yoyPct: s.yoyPct,
    isYoY: s.isYoY,
    extended: s.extended,
  };
}
