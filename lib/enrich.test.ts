import { describe, it, expect } from "vitest";
import { trendStats, daysBetween } from "./enrich";

const pts = (vals: number[]) =>
  vals.map((value, i) => ({ date: `2026-01-${(i % 28) + 1}`, value }));

describe("trendStats", () => {
  it("uses short acceleration when under a year of data", () => {
    // 8 points: last 4 avg 80 vs prior 4 avg 40 → +100%
    const s = trendStats(pts([40, 40, 40, 40, 80, 80, 80, 80]));
    expect(s.isYoY).toBe(false);
    expect(s.momentumPct).toBeCloseTo(1, 5);
  });

  it("computes deseasonalized YoY when given >1 year of weekly data", () => {
    // 60 weekly points: ~52 weeks ago value 50, recent value 100 → +100% YoY
    const arr = Array(60).fill(50);
    for (let i = 56; i < 60; i++) arr[i] = 100;
    const s = trendStats(pts(arr));
    expect(s.isYoY).toBe(true);
    expect(s.yoyPct).toBeCloseTo(1, 5);
    expect(s.momentumPct).toBe(s.yoyPct);
  });

  it("flags extended when latest is near the trailing-year high", () => {
    const arr = Array(30).fill(20);
    arr[29] = 100; // latest is the max
    expect(trendStats(pts(arr)).extended).toBe(true);
  });

  it("is not extended when latest sits mid-range", () => {
    const arr = Array(30).fill(20);
    arr[10] = 100; // high is in the past, latest is low
    expect(trendStats(pts(arr)).extended).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts whole days to an ISO date", () => {
    expect(daysBetween(new Date("2026-06-01T00:00:00Z"), "2026-06-11")).toBe(10);
  });
  it("is negative for past dates", () => {
    expect(daysBetween(new Date("2026-06-30T00:00:00Z"), "2026-06-20")).toBe(-10);
  });
});
