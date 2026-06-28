import { seededRng, lastNDates } from "@/lib/util/prng";
import type {
  PriceSeries,
  TrendsSeries,
  SocialSeries,
  EarningsEvent,
} from "@/lib/providers/types";

/**
 * Generates a coherent "social arbitrage" story per ticker, deterministically.
 *
 * The narrative the dashboard is meant to surface: social chatter rises first,
 * Google search interest follows a few days later, price drifts up into an
 * upcoming earnings date. Each series is derived from a shared latent "buzz"
 * curve (with lag) so the overlay chart actually shows the lead/lag the thesis
 * is about. Some tickers are seeded as "hot" (strong rising buzz) and others
 * as quiet, so the movers feed and scores have meaningful spread.
 */

const DAYS = 90;

// Tickers seeded with a strong, accelerating buzz wave near the end of the
// window — these should bubble up in the movers feed.
const HOT = new Set(["CELH", "ELF", "DECK", "CAVA"]);
const WARM = new Set(["CROX", "DKNG", "RBLX"]);

function buzzCurve(symbol: string, dates: string[]): number[] {
  const rng = seededRng(symbol + ":buzz");
  const n = dates.length;
  const base = 18 + rng() * 22;
  const hot = HOT.has(symbol);
  const warm = WARM.has(symbol);

  // A late-window ramp: a logistic surge centered in the last third for hot names.
  const surgeCenter = hot ? 0.78 : warm ? 0.62 : 0.45 + rng() * 0.3;
  const surgeWidth = hot ? 0.12 : 0.2;
  const surgeAmp = hot ? 70 : warm ? 38 : 8 + rng() * 14;

  const out: number[] = [];
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const logistic = 1 / (1 + Math.exp(-(x - surgeCenter) / surgeWidth));
    drift += (rng() - 0.5) * 4; // random walk wobble
    drift *= 0.92;
    const noise = (rng() - 0.5) * 8;
    out.push(Math.max(2, base + surgeAmp * logistic + drift + noise));
  }
  return out;
}

/** Shift a series forward by `lag` days (later series lags the leader). */
function lagged(values: number[], lag: number): number[] {
  if (lag <= 0) return values.slice();
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    out.push(values[Math.max(0, i - lag)]);
  }
  return out;
}

function normalize0to100(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => Math.round((v / max) * 100));
}

export interface TickerBundle {
  price: PriceSeries;
  trends: TrendsSeries;
  social: SocialSeries;
  earnings: EarningsEvent[];
}

export function generateBundle(symbol: string): TickerBundle {
  const dates = lastNDates(DAYS);
  const rng = seededRng(symbol + ":price");

  const buzz = buzzCurve(symbol, dates);

  // Social leads, trends lag ~3 days, price reacts with a ~6 day lag + its own drift.
  const socialRaw = buzz;
  const trendsRaw = lagged(buzz, 3).map((v, i) => v * (0.85 + 0.3 * (i / dates.length)));
  const trends = normalize0to100(trendsRaw);

  // Mentions: scale buzz into plausible daily counts with weekday noise.
  const social = socialRaw.map((v, i) => {
    const r = seededRng(symbol + ":m" + i)();
    return {
      t: dates[i],
      mentions: Math.round(v * (6 + r * 5)),
      sentiment: Math.max(-1, Math.min(1, (v / 100 - 0.4) * 1.6 + (r - 0.5) * 0.5)),
    };
  });

  // Price: a random walk nudged upward by lagged buzz momentum.
  const startPrice = 20 + rng() * 180;
  const priceLag = lagged(buzz, 6);
  const prices: { t: string; value: number }[] = [];
  let p = startPrice;
  for (let i = 0; i < dates.length; i++) {
    const momentum = i > 0 ? (priceLag[i] - priceLag[i - 1]) / 100 : 0;
    const shock = (rng() - 0.5) * 0.025;
    p = p * (1 + momentum * 0.06 + shock);
    prices.push({ t: dates[i], value: Math.round(p * 100) / 100 });
  }

  // Earnings: next report 5-25 days out, plus the prior one inside the window.
  const daysOut = 5 + Math.floor(seededRng(symbol + ":e")() * 20);
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + daysOut);
  const prior = new Date();
  prior.setUTCDate(prior.getUTCDate() - (60 + Math.floor(rng() * 20)));
  const eps = Math.round((0.2 + rng() * 2) * 100) / 100;
  const actual = Math.round(eps * (0.9 + rng() * 0.3) * 100) / 100;

  const earnings: EarningsEvent[] = [
    {
      symbol,
      reportDate: prior.toISOString().slice(0, 10),
      time: rng() > 0.5 ? "amc" : "bmo",
      epsEstimate: eps,
      epsActual: actual,
      surprisePct: Math.round(((actual - eps) / eps) * 1000) / 10,
    },
    {
      symbol,
      reportDate: next.toISOString().slice(0, 10),
      time: rng() > 0.5 ? "amc" : "bmo",
      epsEstimate: Math.round((eps * (1 + (rng() - 0.4) * 0.2)) * 100) / 100,
      epsActual: null,
      surprisePct: null,
    },
  ];

  return {
    price: { symbol, source: "mock", points: prices },
    trends: { symbol, keyword: symbol, source: "mock", points: dates.map((t, i) => ({ t, value: trends[i] })) },
    social: { symbol, source: "mock", points: social },
    earnings,
  };
}
