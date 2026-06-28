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

// Compact spec for expanded-universe names → full Opportunity objects.
type Spec = {
  ticker: string;
  company: string;
  product: string;
  keyword: string;
  category: string;
  earningsDate: string;
  notes: string;
  shape: number[];
};

function expanded(specs: Spec[]): Opportunity[] {
  return specs.map(({ shape, ...rest }) => ({
    ...rest,
    earningsTentative: true,
    conviction: "medium",
    status: "watching",
    sampleTrend: monthly(shape),
  }));
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
    earningsDate: "2026-07-29",
    earningsTiming: "am",
    earningsTentative: true,
    estimateEps: 0.54,
    epsHistory: [
      { label: "Q2 '25", estimate: 0.36, actual: 0.38 },
      { label: "Q3 '25", estimate: 0.32, actual: 0.4 },
      { label: "Q4 '25", estimate: 0.13, actual: 0.09 },
      { label: "Q1 '26", estimate: 0.33, actual: 0.5 },
    ],
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
    earningsTiming: "am",
    earningsTentative: true,
    estimateEps: 0.43,
    epsHistory: [
      { label: "Q2 '25", estimate: 0.24, actual: 0.47 },
      { label: "Q3 '25", estimate: 0.28, actual: 0.42 },
      { label: "Q4 '25", estimate: 0.19, actual: 0.26 },
      { label: "Q1 '26", estimate: 0.29, actual: 0.41 },
    ],
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
    earningsTiming: "pm",
    earningsTentative: true,
    estimateEps: 0.69,
    epsHistory: [
      { label: "Q1 '26", estimate: 0.75, actual: 0.89 },
      { label: "Q2 '26", estimate: 0.48, actual: 0.68 },
      { label: "Q3 '26", estimate: 0.61, actual: 1.24 },
      { label: "Q4 '26", estimate: 0.23, actual: 0.32 },
    ],
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
    earningsDate: "2026-08-06",
    earningsTiming: "am",
    earningsTentative: true,
    estimateEps: 4.31,
    epsHistory: [
      { label: "Q2 '25", estimate: 4.03, actual: 4.23 },
      { label: "Q3 '25", estimate: 2.36, actual: 2.92 },
      { label: "Q4 '25", estimate: 1.91, actual: 2.29 },
      { label: "Q1 '26", estimate: 2.78, actual: 2.99 },
    ],
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
    earningsTiming: "am",
    earningsTentative: true,
    estimateEps: 1.03,
    epsHistory: [
      { label: "Q2 '25", estimate: 0.87, actual: 1.0 },
      { label: "Q3 '25", estimate: 0.92, actual: 1.09 },
      { label: "Q4 '25", estimate: 0.84, actual: 1.0 },
      { label: "Q1 '26", estimate: 1.02, actual: 1.18 },
    ],
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
    earningsDate: "2026-07-23",
    earningsTiming: "pm",
    earningsTentative: true,
    estimateEps: 0.88,
    epsHistory: [
      { label: "Q1 '26", estimate: 0.68, actual: 0.93 },
      { label: "Q2 '26", estimate: 1.58, actual: 1.82 },
      { label: "Q3 '26", estimate: 2.77, actual: 3.33 },
      { label: "Q4 '26", estimate: 0.83, actual: 0.96 },
    ],
    conviction: "high",
    status: "watching",
    notes:
      "Hoka still compounding in search; running-shoe adoption broadening beyond enthusiasts.",
    sampleTrend: monthly([55, 58, 60, 63, 66, 68, 71, 73, 76, 78, 81, 84]),
  },

  // --- Expanded universe -------------------------------------------------
  // Broader watchlist of consumer/social-trend names. Earnings dates are
  // approximate placeholders; the Finnhub overlay in /api/opportunities
  // replaces them with the real next date when FINNHUB_API_KEY is set.
  ...expanded([
    {
      ticker: "CAVA",
      company: "CAVA Group",
      product: "CAVA",
      keyword: "cava",
      category: "Restaurants",
      earningsDate: "2026-08-13",
      notes: "Mediterranean fast-casual; TikTok food content drives traffic.",
      shape: [40, 44, 47, 50, 54, 58, 62, 67, 70, 74, 78, 82],
    },
    {
      ticker: "DUOL",
      company: "Duolingo",
      product: "Duolingo",
      keyword: "duolingo",
      category: "Apps",
      earningsDate: "2026-08-06",
      notes: "Owl-meme marketing; viral streak culture lifts DAU/subscriptions.",
      shape: [60, 63, 62, 66, 69, 72, 70, 74, 77, 80, 83, 85],
    },
    {
      ticker: "ONON",
      company: "On Holding",
      product: "On Cloud shoes",
      keyword: "on cloud shoes",
      category: "Footwear",
      earningsDate: "2026-08-12",
      notes: "On running shoes spreading from athletes to lifestyle wear.",
      shape: [45, 48, 52, 55, 58, 60, 64, 67, 71, 74, 77, 80],
    },
    {
      ticker: "BIRK",
      company: "Birkenstock",
      product: "Birkenstock",
      keyword: "birkenstock",
      category: "Footwear",
      earningsDate: "2026-08-27",
      notes: "Post-Barbie halo; clogs/Bostons cycling through fashion feeds.",
      shape: [66, 63, 61, 60, 62, 59, 58, 57, 60, 58, 57, 55],
    },
    {
      ticker: "OLPX",
      company: "Olaplex",
      product: "Olaplex",
      keyword: "olaplex",
      category: "Beauty",
      earningsDate: "2026-08-04",
      notes: "Haircare; watch for renewed creator buzz vs. fading search.",
      shape: [58, 55, 52, 50, 48, 47, 45, 44, 43, 42, 41, 40],
    },
    {
      ticker: "BROS",
      company: "Dutch Bros",
      product: "Dutch Bros",
      keyword: "dutch bros",
      category: "Restaurants",
      earningsDate: "2026-08-05",
      notes: "Drive-thru coffee expansion; energy drinks trend on TikTok.",
      shape: [50, 53, 55, 57, 60, 62, 65, 67, 70, 73, 76, 79],
    },
    {
      ticker: "SG",
      company: "Sweetgreen",
      product: "Sweetgreen",
      keyword: "sweetgreen",
      category: "Restaurants",
      earningsDate: "2026-08-06",
      notes: "Salad chain; Ripple fries launch and protein-plate buzz.",
      shape: [55, 56, 54, 57, 59, 58, 61, 63, 62, 65, 67, 66],
    },
    {
      ticker: "LULU",
      company: "Lululemon",
      product: "Lululemon",
      keyword: "lululemon",
      category: "Apparel",
      earningsDate: "2026-09-03",
      notes: "Athleisure staple; dupe discourse cuts both ways — watch momentum.",
      shape: [72, 70, 71, 69, 68, 67, 66, 65, 64, 63, 62, 61],
    },
    {
      ticker: "FIGS",
      company: "FIGS",
      product: "FIGS scrubs",
      keyword: "figs scrubs",
      category: "Apparel",
      earningsDate: "2026-08-06",
      notes: "Healthcare apparel; nurse/med-student creator marketing.",
      shape: [48, 49, 50, 51, 52, 53, 54, 56, 57, 59, 61, 63],
    },
    {
      ticker: "FRPT",
      company: "Freshpet",
      product: "Freshpet",
      keyword: "freshpet",
      category: "Consumer staples",
      earningsDate: "2026-08-04",
      notes: "Fresh pet food; fridge expansion + humanization-of-pets trend.",
      shape: [52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74],
    },
    {
      ticker: "VITL",
      company: "Vital Farms",
      product: "Vital Farms eggs",
      keyword: "vital farms",
      category: "Consumer staples",
      earningsDate: "2026-08-07",
      notes: "Pasture-raised eggs; premium-egg shift and clean-label demand.",
      shape: [44, 47, 49, 52, 55, 58, 61, 63, 66, 69, 72, 75],
    },
    {
      ticker: "BYND",
      company: "Beyond Meat",
      product: "Beyond Meat",
      keyword: "beyond meat",
      category: "Consumer staples",
      earningsDate: "2026-08-05",
      notes: "Plant-based; search in secular decline — contrarian watch only.",
      shape: [60, 56, 53, 50, 47, 45, 43, 41, 40, 38, 37, 36],
    },
    {
      ticker: "BRCC",
      company: "BRC Inc.",
      product: "Black Rifle Coffee",
      keyword: "black rifle coffee",
      category: "Beverages",
      earningsDate: "2026-08-11",
      notes: "DTC + retail coffee; loyal community, watch retail-velocity buzz.",
      shape: [50, 51, 52, 51, 53, 54, 53, 55, 56, 57, 58, 59],
    },
    {
      ticker: "PLNT",
      company: "Planet Fitness",
      product: "Planet Fitness",
      keyword: "planet fitness",
      category: "Fitness",
      earningsDate: "2026-08-06",
      notes: "Gym memberships; Jan seasonality plus Gen-Z member push.",
      shape: [58, 60, 59, 61, 62, 61, 63, 64, 63, 65, 66, 65],
    },
    {
      ticker: "ULTA",
      company: "Ulta Beauty",
      product: "Ulta Beauty",
      keyword: "ulta",
      category: "Beauty",
      earningsDate: "2026-08-27",
      notes: "Beauty retailer; benefits from the same TikTok beauty cycles.",
      shape: [62, 63, 62, 64, 65, 64, 66, 67, 66, 68, 69, 70],
    },
  ]),
];
