import type { ScoreComponents, EarningsEvent } from "@/lib/providers/types";

/** Shape returned by /api/movers (kept in sync with app/api/movers/route.ts). */
export interface MoverRow {
  symbol: string;
  name: string;
  sector: string;
  score: number;
  components: ScoreComponents;
  latestPrice: number | null;
  priceChangePct: number | null;
  nextEarnings: EarningsEvent | null;
}

/** Shape returned by /api/earnings. */
export interface EarningsRow extends EarningsEvent {
  name: string;
  score: number;
  daysUntil: number;
}
