import { describe, it, expect } from "vitest";
import { nearestIndex, yoyAt, backtestName, aggregate } from "./backtest";

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
