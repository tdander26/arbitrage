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

/** Momentum = avg(last 3 points) − avg(prior 3 points). */
export function momentumOf(points: TrendPoint[]): {
  latest: number;
  momentum: number;
  momentumPct: number;
} {
  const vals = points.map((p) => p.value);
  const latest = vals[vals.length - 1] ?? 0;
  const last3 = avg(vals.slice(-3));
  const prior3 = avg(vals.slice(-6, -3));
  const momentum = last3 - prior3;
  const momentumPct = prior3 > 0 ? momentum / prior3 : 0;
  return { latest, momentum, momentumPct };
}

/** Layer request-time derived fields onto an opportunity using a trend series. */
export function enrich(
  opp: Opportunity,
  points: TrendPoint[],
  now: Date,
): EnrichedOpportunity {
  const { latest, momentum, momentumPct } = momentumOf(points);
  return {
    ...opp,
    daysToEarnings: daysBetween(now, opp.earningsDate),
    latest,
    momentum,
    momentumPct,
  };
}
