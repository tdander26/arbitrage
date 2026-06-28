import type { Quote, Venue } from "./arbitrage";

// Synthetic market feed. In production each venue's bid/ask would come from a
// real exchange websocket/REST API; here we generate plausible quotes around a
// reference mid price so the dashboard is fully functional without API keys.
// Small per-venue jitter is what surfaces (and removes) arbitrage opportunities
// on each refresh.

type Market = {
  symbol: string;
  mid: number;
  venues: { name: string; feeRate: number }[];
};

const VENUES = [
  { name: "Binance", feeRate: 0.001 },
  { name: "Coinbase", feeRate: 0.006 },
  { name: "Kraken", feeRate: 0.0016 },
  { name: "Bitstamp", feeRate: 0.004 },
];

const MARKETS: Market[] = [
  { symbol: "BTC/USD", mid: 67_400, venues: VENUES },
  { symbol: "ETH/USD", mid: 3_510, venues: VENUES },
  { symbol: "SOL/USD", mid: 168.4, venues: VENUES },
  { symbol: "XRP/USD", mid: 0.612, venues: VENUES },
  { symbol: "DOGE/USD", mid: 0.1487, venues: VENUES },
  { symbol: "AVAX/USD", mid: 36.2, venues: VENUES },
];

/** Random value in [-spread, +spread]. */
function jitter(spread: number): number {
  return (Math.random() * 2 - 1) * spread;
}

/** Build a live snapshot of quotes across all venues for all markets. */
export function getQuotes(): Quote[] {
  return MARKETS.map((market) => {
    const venues: Venue[] = market.venues.map((v) => {
      // Each venue drifts slightly from the reference mid, with a tight spread.
      const venueMid = market.mid * (1 + jitter(0.0025));
      const halfSpread = venueMid * (0.0003 + Math.random() * 0.0007);
      return {
        name: v.name,
        feeRate: v.feeRate,
        bid: round(venueMid - halfSpread, market.mid),
        ask: round(venueMid + halfSpread, market.mid),
      };
    });
    return { symbol: market.symbol, venues };
  });
}

// Round to a sensible number of decimals based on price magnitude.
function round(value: number, reference: number): number {
  const decimals = reference >= 100 ? 2 : reference >= 1 ? 3 : 5;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
