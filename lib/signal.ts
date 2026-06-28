import type { EpsQuarter } from "./types";

// Composite "Signal" score for ranking opportunities by edge.
//
// The social-arbitrage edge is strongest when: (1) the search/social trend is
// ACCELERATING (you're early, not chasing), (2) interest is already at a
// meaningful level (real demand, not noise), and (3) the company has a history
// of CONVERTING demand into earnings beats. We blend those into one 0–100 score.

/** Fraction of reported quarters that beat consensus (0–1). 0.5 if unknown. */
export function beatRate(history?: EpsQuarter[]): number {
  if (!history || history.length === 0) return 0.5;
  const beats = history.filter((q) => q.actual >= q.estimate).length;
  return beats / history.length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type SignalInputs = {
  /** Search momentum: avg(last 3) − avg(prior 3) as a fraction of prior avg. */
  momentumPct: number;
  /** Latest interest level, 0–100. */
  latest: number;
  /** Historical beat rate, 0–1. */
  beat: number;
};

export type SignalBreakdown = {
  score: number; // 0–100
  acceleration: number; // 0–100 sub-score
  interest: number; // 0–100 sub-score
  conversion: number; // 0–100 sub-score
};

// Weights: acceleration dominates (being early is the whole game), interest and
// conversion temper it so we don't chase noise or names that never beat.
const W_ACCEL = 0.5;
const W_INTEREST = 0.2;
const W_CONVERSION = 0.3;

// +30% MoM acceleration saturates the acceleration sub-score.
const ACCEL_FULL = 0.3;

export function computeSignal(inputs: SignalInputs): SignalBreakdown {
  const acceleration = clamp01(inputs.momentumPct / ACCEL_FULL) * 100;
  const interest = clamp01(inputs.latest / 100) * 100;
  const conversion = clamp01(inputs.beat) * 100;
  const score =
    W_ACCEL * acceleration +
    W_INTEREST * interest +
    W_CONVERSION * conversion;
  return {
    score: Math.round(score),
    acceleration: Math.round(acceleration),
    interest: Math.round(interest),
    conversion: Math.round(conversion),
  };
}
