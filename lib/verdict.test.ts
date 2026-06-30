import { describe, it, expect } from "vitest";
import { makeVerdict } from "./verdict";

const baseGood = {
  signalScore: 80,
  momentumPct: 0.2,
  latest: 90,
  beatsCount: 4,
  quarters: 4,
  daysToEarnings: 20,
  hasTrend: true,
  scored: true,
};

describe("makeVerdict", () => {
  it("scores a strong live setup", () => {
    const v = makeVerdict(baseGood);
    expect(v.tier).toBe("Strong");
    expect(v.line).toContain("search");
  });

  it("refuses to score placeholder (non-live) trends", () => {
    const v = makeVerdict({ ...baseGood, scored: false });
    expect(v.tier).toBe("Unscored");
    expect(v.line.toLowerCase()).toContain("not scored");
    // No fabricated acceleration/interest chips when unscored.
    expect(v.chips.some((c) => c.label.includes("accel"))).toBe(false);
  });

  it("says so when there is no trend data at all", () => {
    const v = makeVerdict({ ...baseGood, hasTrend: false });
    expect(v.tier).toBe("Unscored");
    expect(v.line.toLowerCase()).toContain("no live trend");
  });

  it("adds an extended flag near 12-mo highs", () => {
    const v = makeVerdict({ ...baseGood, extended: true });
    expect(v.line).toContain("extended");
    expect(v.chips.some((c) => c.label === "extended")).toBe(true);
  });

  it("labels past earnings instead of negative days", () => {
    const v = makeVerdict({ ...baseGood, daysToEarnings: -5 });
    expect(v.chips.some((c) => c.label === "earnings passed")).toBe(true);
    expect(v.chips.some((c) => c.label.includes("-5"))).toBe(false);
  });
});
