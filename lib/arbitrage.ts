// Core arbitrage logic: given quoted bid/ask prices for the same asset across
// venues, find the best cross-venue spread (buy low on one, sell high on
// another) and express it net of a simple per-leg fee.

export type Venue = {
  name: string;
  /** Best price you can BUY at (the venue's ask). */
  ask: number;
  /** Best price you can SELL at (the venue's bid). */
  bid: number;
  /** Taker fee as a fraction, e.g. 0.001 = 0.1%. */
  feeRate: number;
};

export type Quote = {
  symbol: string;
  venues: Venue[];
};

export type Opportunity = {
  symbol: string;
  buyVenue: string;
  sellVenue: string;
  buyPrice: number;
  sellPrice: number;
  /** Gross spread as a fraction of the buy price. */
  grossPct: number;
  /** Spread after taker fees on both legs, as a fraction of the buy price. */
  netPct: number;
  /** Net profit on a 1-unit trade, in quote currency. */
  netProfit: number;
};

/**
 * Find the most profitable buy/sell venue pair for a symbol, net of fees.
 * Returns null when no positive-net opportunity exists.
 */
export function findBestArbitrage(quote: Quote): Opportunity | null {
  let best: Opportunity | null = null;

  for (const buy of quote.venues) {
    for (const sell of quote.venues) {
      if (buy.name === sell.name) continue;

      const buyPrice = buy.ask;
      const sellPrice = sell.bid;

      // Cost to acquire one unit (incl. fee) vs. proceeds from selling it.
      const cost = buyPrice * (1 + buy.feeRate);
      const proceeds = sellPrice * (1 - sell.feeRate);
      const netProfit = proceeds - cost;

      const grossPct = (sellPrice - buyPrice) / buyPrice;
      const netPct = netProfit / buyPrice;

      if (netProfit > 0 && (best === null || netProfit > best.netProfit)) {
        best = {
          symbol: quote.symbol,
          buyVenue: buy.name,
          sellVenue: sell.name,
          buyPrice,
          sellPrice,
          grossPct,
          netPct,
          netProfit,
        };
      }
    }
  }

  return best;
}

/** Find opportunities across many symbols, sorted by net return descending. */
export function scanOpportunities(quotes: Quote[]): Opportunity[] {
  return quotes
    .map(findBestArbitrage)
    .filter((o): o is Opportunity => o !== null)
    .sort((a, b) => b.netPct - a.netPct);
}
