import type { TrendPoint } from "./types";
import type { DailyClose } from "./prices";

// Directional validation harness: does rising year-over-year search interest
// INTO a print actually precede an earnings beat? We line up each past quarter's
// report date against the historical weekly trend, compute the YoY momentum that
// existed then, and bucket beats by that momentum.
//
// Caveats (this is evidence, not proof): small sample, the trend anchor uses the
// fiscal-period date (±weeks of the actual report), and Google Trends is a noisy
// proxy. Treat it as directional.

export type BtRow = {
  date: string;
  momentumPct: number;
  beat: boolean;
  surprisePct: number;
  /** ~1-week post-earnings stock return, or null when prices are unavailable. */
  ret: number | null;
};

/**
 * Stock return from the report-day close to `holdDays` trading days later — the
 * actual outcome that matters (a beat that's already priced in can still drop).
 */
export function postEarningsReturn(
  closes: DailyClose[],
  iso: string,
  holdDays = 5,
): number | null {
  if (closes.length === 0) return null;
  const t = ts(iso);
  let i = -1;
  for (let k = 0; k < closes.length; k++) {
    if (ts(closes[k].date) <= t) i = k;
    else break;
  }
  if (i < 0) return null;
  const after = closes[Math.min(i + holdDays, closes.length - 1)];
  const before = closes[i];
  if (!before || before.close <= 0 || !after) return null;
  return after.close / before.close - 1;
}

function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

function ts(iso: string): number {
  return Date.parse(iso.length <= 10 ? iso + "T00:00:00Z" : iso);
}

/** Index of the trend point closest in time to an ISO date. */
export function nearestIndex(points: TrendPoint[], iso: string): number {
  const t = ts(iso);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(ts(points[i].date) - t);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** YoY momentum at a given index of a weekly series (null if too early). */
export function yoyAt(points: TrendPoint[], idx: number): number | null {
  if (idx < 55) return null;
  const vals = points.map((p) => p.value);
  const recent = avg(vals.slice(idx - 3, idx + 1));
  const yearAgo = avg(vals.slice(idx - 55, idx - 51));
  if (yearAgo <= 0) return null;
  return (recent - yearAgo) / yearAgo;
}

/** Build rows for one name from its trend + dated history (+ optional prices). */
export function backtestName(
  points: TrendPoint[],
  history: { date?: string; estimate: number; actual: number }[],
  closes?: DailyClose[],
): BtRow[] {
  const rows: BtRow[] = [];
  for (const q of history) {
    if (!q.date) continue;
    const m = yoyAt(points, nearestIndex(points, q.date));
    if (m === null) continue;
    rows.push({
      date: q.date,
      momentumPct: m,
      beat: q.actual >= q.estimate,
      surprisePct:
        q.estimate !== 0 ? (q.actual - q.estimate) / Math.abs(q.estimate) : 0,
      ret: closes && closes.length ? postEarningsReturn(closes, q.date) : null,
    });
  }
  return rows;
}

export type BtBucket = {
  n: number;
  beatRate: number;
  avgSurprise: number;
  /** Rows that have a price return. */
  retN: number;
  /** Average ~1-week post-earnings return. */
  avgReturn: number;
  /** Share of prints with a positive post-earnings return. */
  upRate: number;
};
export type BtResult = { n: number; pos: BtBucket; neg: BtBucket };

function bucket(rows: BtRow[]): BtBucket {
  const withRet = rows.filter((r) => r.ret !== null) as (BtRow & {
    ret: number;
  })[];
  return {
    n: rows.length,
    beatRate: rows.length ? rows.filter((r) => r.beat).length / rows.length : 0,
    avgSurprise: avg(rows.map((r) => r.surprisePct)),
    retN: withRet.length,
    avgReturn: avg(withRet.map((r) => r.ret)),
    upRate: withRet.length
      ? withRet.filter((r) => r.ret > 0).length / withRet.length
      : 0,
  };
}

/** Aggregate rows into positive- vs non-positive-momentum buckets. */
export function aggregate(rows: BtRow[]): BtResult {
  return {
    n: rows.length,
    pos: bucket(rows.filter((r) => r.momentumPct > 0)),
    neg: bucket(rows.filter((r) => r.momentumPct <= 0)),
  };
}
