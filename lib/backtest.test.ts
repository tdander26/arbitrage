import { describe, it, expect } from "vitest";
import {
  nearestIndex,
  yoyAt,
  backtestName,
  aggregate,
  postEarningsReturn,
} from "./backtest";

// 120 weekly points starting 2024-01-07, value = index (rising over time).
const points = Array.from({ length: 120 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 0, 7) + i * 7 * 86_400_000);
  return { date: d.toISOString().slice(0, 10), value: i };
});

describe("nearestIndex", () => {
  it("finds the closest point by date", () => {
    const target = points[80].date;
    expect(nearestIndex(points, target)).toBe(80);
  });
});

describe("yoyAt", () => {
  it("is null before a year of history exists", () => {
    expect(yoyAt(points, 40)).toBeNull();
  });
  it("computes positive YoY for a rising series", () => {
    const m = yoyAt(points, 100);
    expect(m).not.toBeNull();
    expect(m as number).toBeGreaterThan(0);
  });
});

describe("backtestName + aggregate", () => {
  it("buckets beats by momentum sign", () => {
    const history = [
      { date: points[100].date, estimate: 1, actual: 1.2 }, // rising → beat
      { date: points[40].date, estimate: 1, actual: 0.9 }, // <1yr in → no YoY
    ];
    const rows = backtestName(points, history);
    expect(rows.length).toBe(1); // the <1-year row has no YoY and is skipped
    expect(rows[0].beat).toBe(true);
    expect(rows[0].momentumPct).toBeGreaterThan(0);

    const agg = aggregate(rows);
    expect(agg.n).toBe(1);
    expect(agg.pos.n).toBe(1);
    expect(agg.pos.beatRate).toBe(1);
  });

  it("skips quarters with no date", () => {
    const rows = backtestName(points, [{ estimate: 1, actual: 2 }]);
    expect(rows.length).toBe(0);
  });
});

describe("postEarningsReturn", () => {
  const closes = Array.from({ length: 20 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000)
      .toISOString()
      .slice(0, 10),
    close: 100 + i, // rises 1/day
  }));

  it("computes return from report close to holdDays later", () => {
    // report on day index 5 (close 105) → +5 days (close 110) = +4.76%
    const r = postEarningsReturn(closes, closes[5].date, 5);
    expect(r).toBeCloseTo(110 / 105 - 1, 6);
  });
  it("returns null when there is no prior trading day", () => {
    expect(postEarningsReturn(closes, "2020-01-01", 5)).toBeNull();
  });
  it("returns null for empty price data", () => {
    expect(postEarningsReturn([], "2026-01-05", 5)).toBeNull();
  });
});

describe("aggregate with returns", () => {
  it("reports avg return and up-rate per bucket", () => {
    const rows = [
      { date: "a", momentumPct: 0.2, beat: true, surprisePct: 0.1, ret: 0.05 },
      { date: "b", momentumPct: 0.1, beat: true, surprisePct: 0.1, ret: -0.02 },
      { date: "c", momentumPct: -0.1, beat: false, surprisePct: -0.1, ret: 0.03 },
    ];
    const agg = aggregate(rows);
    expect(agg.pos.retN).toBe(2);
    expect(agg.pos.avgReturn).toBeCloseTo(0.015, 6);
    expect(agg.pos.upRate).toBe(0.5);
    expect(agg.neg.retN).toBe(1);
    expect(agg.neg.avgReturn).toBeCloseTo(0.03, 6);
  });
});
