import { describe, it, expect } from "vitest";
import {
  beatRate,
  meaningfulBeatRate,
  computeSignal,
} from "./signal";

const q = (estimate: number, actual: number) => ({ label: "Q", estimate, actual });

describe("beatRate", () => {
  it("is 0.5 with no history", () => {
    expect(beatRate(undefined)).toBe(0.5);
    expect(beatRate([])).toBe(0.5);
  });
  it("counts any beat (actual >= estimate)", () => {
    expect(beatRate([q(1, 1), q(1, 2), q(2, 1), q(1, 1.5)])).toBe(0.75);
  });
});

describe("meaningfulBeatRate", () => {
  it("only counts beats above the threshold", () => {
    // 1.00 vs 1.00 = 0% (no), 1.00 vs 1.06 = +6% (yes), 1 vs 1.2 (yes), 1 vs 0.9 (no)
    expect(meaningfulBeatRate([q(1, 1), q(1, 1.06), q(1, 1.2), q(1, 0.9)])).toBe(
      0.5,
    );
  });
  it("is 0.5 with no history", () => {
    expect(meaningfulBeatRate(undefined)).toBe(0.5);
  });
});

describe("computeSignal", () => {
  it("maxes out at 100 with full inputs", () => {
    const s = computeSignal({ momentumPct: 0.3, latest: 100, beat: 1 });
    expect(s.score).toBe(100);
    expect(s.pricedInDiscount).toBe(0);
  });
  it("weights 50/20/30 acceleration/interest/conversion", () => {
    const s = computeSignal({ momentumPct: 0.15, latest: 50, beat: 0.5 });
    // accel 50, interest 50, conversion 50 → 0.5*50+0.2*50+0.3*50 = 50
    expect(s.score).toBe(50);
  });
  it("applies a priced-in discount from the expected move", () => {
    const base = computeSignal({ momentumPct: 0.3, latest: 100, beat: 1 });
    const discounted = computeSignal({
      momentumPct: 0.3,
      latest: 100,
      beat: 1,
      expectedMovePct: 0.4, // full discount
    });
    expect(discounted.pricedInDiscount).toBeCloseTo(0.35, 5);
    expect(discounted.score).toBeLessThan(base.score);
    expect(discounted.score).toBe(65); // 100 * (1 - 0.35)
  });
  it("clamps negative momentum to zero acceleration", () => {
    const s = computeSignal({ momentumPct: -0.5, latest: 80, beat: 1 });
    expect(s.acceleration).toBe(0);
  });
});
