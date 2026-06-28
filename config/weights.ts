import type { ScoreComponents } from "@/lib/providers/types";

/**
 * Tunable weights for the composite arbitrage score. These are intentionally
 * exposed and easy to change — the score is a transparent heuristic, not a
 * prediction. Tune against realized earnings outcomes over time.
 */
export const SCORE_WEIGHTS: ScoreComponents = {
  socialMomentum: 0.35,
  trendsMomentum: 0.3,
  correlation: 0.15,
  earningsProximity: 0.2,
};

/** Lookback windows (days) for momentum calculations. */
export const MOMENTUM_RECENT = 7;
export const MOMENTUM_BASELINE = 30;

/** Earnings within this many days get the full proximity boost. */
export const EARNINGS_WINDOW_DAYS = 21;
