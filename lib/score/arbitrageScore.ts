import type {
  ArbitrageScore,
  EarningsEvent,
  PriceSeries,
  SocialSeries,
  TrendsSeries,
} from "@/lib/providers/types";
import {
  SCORE_WEIGHTS,
  MOMENTUM_RECENT,
  MOMENTUM_BASELINE,
  EARNINGS_WINDOW_DAYS,
} from "@/config/weights";
import { momentumZ, correlation } from "@/lib/timeseries/normalize";

/** Squash a z-like value (~ -3..3) into 0-100. */
function squash(z: number): number {
  return 100 / (1 + Math.exp(-z));
}

function daysUntil(dateIso: string): number {
  const target = new Date(dateIso + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.round((target - now) / 86400000);
}

/** Nearest upcoming earnings date, as a 0..1 proximity boost. */
function earningsProximity(earnings: EarningsEvent[]): number {
  const upcoming = earnings
    .map((e) => daysUntil(e.reportDate))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  if (!upcoming.length) return 0;
  const d = upcoming[0];
  if (d > EARNINGS_WINDOW_DAYS) return 0;
  return 1 - d / EARNINGS_WINDOW_DAYS; // 0 at window edge, 1 on report day
}

export function computeScore(
  symbol: string,
  social: SocialSeries | null,
  trends: TrendsSeries | null,
  _price: PriceSeries | null,
  earnings: EarningsEvent[],
): ArbitrageScore {
  const socialVals = social?.points.map((p) => p.mentions) ?? [];
  const trendsVals = trends?.points.map((p) => p.value) ?? [];

  const socialMomentum = momentumZ(socialVals, MOMENTUM_RECENT, MOMENTUM_BASELINE);
  const trendsMomentum = momentumZ(trendsVals, MOMENTUM_RECENT, MOMENTUM_BASELINE);
  const corr = correlation(socialVals, trendsVals);
  const proximity = earningsProximity(earnings);

  // Normalize each component to 0-100 then weight.
  const components = {
    socialMomentum: squash(socialMomentum),
    trendsMomentum: squash(trendsMomentum),
    correlation: ((corr + 1) / 2) * 100,
    earningsProximity: proximity * 100,
  };

  const w = SCORE_WEIGHTS;
  const score =
    components.socialMomentum * w.socialMomentum +
    components.trendsMomentum * w.trendsMomentum +
    components.correlation * w.correlation +
    components.earningsProximity * w.earningsProximity;

  return {
    symbol,
    t: new Date().toISOString().slice(0, 10),
    score: Math.round(score * 10) / 10,
    components,
    weights: w,
  };
}
