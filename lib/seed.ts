import type { Opportunity, TrendPoint } from "./types";

// Build a 12-month monthly series ending at the most recent whole month.
// `shape` is 12 relative values; we just stamp them with month dates.
function monthly(shape: number[]): TrendPoint[] {
  const now = new Date();
  const points: TrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    points.push({
      date: d.toISOString().slice(0, 10),
      value: shape[11 - i],
    });
  }
  return points;
}

// Seed list of classic social-arbitrage names. The sample trend shapes are
// illustrative (0–100). Swap for live Google Trends / Apify data via the API.
export const SEED: Opportunity[] = [
  {
    ticker: "COCO",
    company: "Vita Coco",
    product: "Coconut water",
    keyword: "coconut water",
    category: "Beverages",
    earningsDate: "2026-08-04",
    conviction: "high",
    status: "watching",
    notes:
      "Summer search seasonality plus sustained TikTok 'electrolyte' content. Watch for the run-up to hold into the print.",
    sampleTrend: monthly([41, 44, 43, 48, 55, 60, 66, 71, 78, 84, 88, 92]),
  },
  {
    ticker: "CELH",
    company: "Celsius Holdings",
    product: "Celsius energy drink",
    keyword: "celsius energy drink",
    category: "Beverages",
    earningsDate: "2026-08-06",
    conviction: "medium",
    status: "watching",
    notes:
      "Fitness-creator driven. Search cooled vs. 2024 peak — looking for re-acceleration, not just high absolute level.",
    sampleTrend: monthly([88, 82, 79, 76, 72, 70, 71, 69, 73, 77, 80, 83]),
  },
  {
    ticker: "ELF",
    company: "e.l.f. Beauty",
    product: "e.l.f. cosmetics",
    keyword: "elf cosmetics",
    category: "Beauty",
    earningsDate: "2026-08-05",
    conviction: "high",
    status: "positioned",
    notes:
      "Consistent GRWM/TikTok virality on specific SKUs (primer, lip oil). Strong estimate-beat history.",
    sampleTrend: monthly([52, 55, 58, 57, 61, 64, 63, 68, 72, 75, 79, 81]),
  },
  {
    ticker: "CROX",
    company: "Crocs",
    product: "Crocs",
    keyword: "crocs",
    category: "Footwear",
    earningsDate: "2026-07-30",
    conviction: "low",
    status: "watching",
    notes:
      "Jibbitz/charm trends are spiky. HEYDUDE remains the drag — social on core Crocs not enough alone.",
    sampleTrend: monthly([70, 68, 66, 64, 65, 63, 62, 61, 60, 62, 61, 59]),
  },
  {
    ticker: "WING",
    company: "Wingstop",
    product: "Wingstop",
    keyword: "wingstop",
    category: "Restaurants",
    earningsDate: "2026-07-29",
    conviction: "medium",
    status: "watching",
    notes:
      "Viral menu/flavor moments drive same-store traffic. Track search around new flavor drops.",
    sampleTrend: monthly([60, 62, 61, 64, 66, 65, 68, 70, 69, 72, 74, 73]),
  },
  {
    ticker: "DECK",
    company: "Deckers Brands",
    product: "Hoka shoes",
    keyword: "hoka",
    category: "Footwear",
    earningsDate: "2026-07-24",
    conviction: "high",
    status: "watching",
    notes:
      "Hoka still compounding in search; running-shoe adoption broadening beyond enthusiasts.",
    sampleTrend: monthly([55, 58, 60, 63, 66, 68, 71, 73, 76, 78, 81, 84]),
  },
];
