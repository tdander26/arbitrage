import { marketProvider, trendsProvider, socialProvider } from "@/lib/providers/registry";
import { computeScore } from "@/lib/score/arbitrageScore";
import { rescale0to100 } from "@/lib/timeseries/normalize";
import { getWatchlist } from "@/lib/watchlist";
import type { ArbitrageScore, EarningsEvent } from "@/lib/providers/types";

export interface MergedChartPoint {
  t: string;
  price: number | null;
  trends: number | null;
  social: number | null;
}

export interface TickerSignal {
  symbol: string;
  name: string;
  sector: string;
  chart: MergedChartPoint[];
  priceRaw: { t: string; value: number }[];
  score: ArbitrageScore;
  earnings: EarningsEvent[];
  latestPrice: number | null;
  priceChangePct: number | null;
  nextEarnings: EarningsEvent | null;
}

function nextEarnings(earnings: EarningsEvent[]): EarningsEvent | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = earnings
    .filter((e) => e.reportDate >= today)
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  return upcoming[0] ?? null;
}

/** Full signal bundle for one ticker — providers + merged chart + score. */
export async function getTickerSignal(symbol: string, name = symbol, sector = "—"): Promise<TickerSignal> {
  const [price, trends, social, earnings] = await Promise.all([
    marketProvider().getPriceSeries(symbol),
    trendsProvider().getTrends(symbol),
    socialProvider().getSocial(symbol),
    marketProvider().getEarnings(symbol),
  ]);

  const score = computeScore(symbol, social, trends, price, earnings);

  // Merge the three series onto a shared date axis, each rescaled 0-100.
  const priceScaled = rescale0to100(price?.points ?? []);
  const trendsScaled = trends?.points ?? [];
  const socialScaled = rescale0to100(
    (social?.points ?? []).map((p) => ({ t: p.t, value: p.mentions })),
  );

  const byDate = new Map<string, MergedChartPoint>();
  for (const p of priceScaled) byDate.set(p.t, { t: p.t, price: p.value, trends: null, social: null });
  for (const p of trendsScaled) {
    const e = byDate.get(p.t) ?? { t: p.t, price: null, trends: null, social: null };
    e.trends = p.value;
    byDate.set(p.t, e);
  }
  for (const p of socialScaled) {
    const e = byDate.get(p.t) ?? { t: p.t, price: null, trends: null, social: null };
    e.social = p.value;
    byDate.set(p.t, e);
  }
  const chart = [...byDate.values()].sort((a, b) => a.t.localeCompare(b.t));

  const pts = price?.points ?? [];
  const latestPrice = pts.length ? pts[pts.length - 1].value : null;
  const priceChangePct =
    pts.length > 1 ? ((pts[pts.length - 1].value - pts[pts.length - 2].value) / pts[pts.length - 2].value) * 100 : null;

  return {
    symbol,
    name,
    sector,
    chart,
    priceRaw: pts,
    score,
    earnings,
    latestPrice,
    priceChangePct: priceChangePct === null ? null : Math.round(priceChangePct * 100) / 100,
    nextEarnings: nextEarnings(earnings),
  };
}

/** Lightweight signal for every watched ticker (for the home grid + movers). */
export async function getAllSignals(): Promise<TickerSignal[]> {
  const wl = await getWatchlist();
  const signals = await Promise.all(wl.map((t) => getTickerSignal(t.symbol, t.name, t.sector)));
  return signals;
}
