import type { TimeSeriesPoint } from "@/lib/providers/types";

/** Rescale a series to 0-100 for overlaying on a shared axis. */
export function rescale0to100(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (!points.length) return [];
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return points.map((p) => ({ t: p.t, value: Math.round(((p.value - min) / span) * 1000) / 10 }));
}

/** Mean of the last `n` values. */
export function trailingMean(values: number[], n: number): number {
  if (!values.length) return 0;
  const slice = values.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

/**
 * Momentum = how far the recent window sits above its own baseline, in
 * standard-deviation units (a z-like score). Positive => accelerating.
 */
export function momentumZ(values: number[], recent: number, baseline: number): number {
  if (values.length < 3) return 0;
  const recentMean = trailingMean(values, recent);
  const base = values.slice(-baseline);
  const sd = stddev(base) || 1;
  return (recentMean - mean(base)) / sd;
}

/** Pearson correlation of two equal-length series. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const aa = a.slice(-n);
  const bb = b.slice(-n);
  const ma = mean(aa);
  const mb = mean(bb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = aa[i] - ma;
    const y = bb[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db) || 1;
  return num / den;
}
