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

/**
 * Fraction of quarters that beat by a MEANINGFUL margin (default >5%). ~70% of
 * all companies beat by a penny, so a bare beat-rate barely discriminates;
 * sizeable surprises are the real signal that demand is outrunning estimates.
 */
export function meaningfulBeatRate(
  history?: EpsQuarter[],
  threshold = 0.05,
): number {
  if (!history || history.length === 0) return 0.5;
  const big = history.filter(
    (q) =>
      q.estimate !== 0 &&
      (q.actual - q.estimate) / Math.abs(q.estimate) > threshold,
  ).length;
  return big / history.length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type SignalInputs = {
  /** Deseasonalized (YoY when available) search acceleration, as a fraction. */
  momentumPct: number;
  /** Latest interest level, 0–100. */
  latest: number;
  /** Meaningful-beat conversion rate, 0–1. */
  beat: number;
  /** Options-implied expected move (ATM straddle), if known — discounts edge. */
  expectedMovePct?: number;
};

export type SignalBreakdown = {
  score: number; // 0–100, after any priced-in discount
  acceleration: number; // 0–100 sub-score
  interest: number; // 0–100 sub-score
  conversion: number; // 0–100 sub-score
  pricedInDiscount: number; // 0–1 haircut applied for what's already priced in
};

// Weights: acceleration dominates (being early is the whole game), interest and
// conversion temper it so we don't chase noise or names that never beat.
const W_ACCEL = 0.5;
const W_INTEREST = 0.2;
const W_CONVERSION = 0.3;

// +30% YoY acceleration saturates the acceleration sub-score.
const ACCEL_FULL = 0.3;
// A ±40% expected move applies the full discount; the edge is "what the signal
// adds beyond what the options market already prices in".
const PRICED_IN_FULL = 0.4;
const MAX_DISCOUNT = 0.35;

export function computeSignal(inputs: SignalInputs): SignalBreakdown {
  const acceleration = clamp01(inputs.momentumPct / ACCEL_FULL) * 100;
  const interest = clamp01(inputs.latest / 100) * 100;
  const conversion = clamp01(inputs.beat) * 100;
  const base =
    W_ACCEL * acceleration + W_INTEREST * interest + W_CONVERSION * conversion;

  // Discount the score by how much of the move is already priced into options.
  const pricedInDiscount =
    typeof inputs.expectedMovePct === "number"
      ? clamp01(inputs.expectedMovePct / PRICED_IN_FULL) * MAX_DISCOUNT
      : 0;

  return {
    score: Math.round(base * (1 - pricedInDiscount)),
    acceleration: Math.round(acceleration),
    interest: Math.round(interest),
    conversion: Math.round(conversion),
    pricedInDiscount,
  };
}
