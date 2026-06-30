import { describe, it, expect } from "vitest";
import { cleanTicker, cleanKeyword } from "./validate";

describe("cleanTicker", () => {
  it("uppercases simple tickers", () => {
    expect(cleanTicker("nke")).toBe("NKE");
    expect(cleanTicker("  celh ")).toBe("CELH");
  });
  it("accepts a single class suffix", () => {
    expect(cleanTicker("BRK.B")).toBe("BRK.B");
    expect(cleanTicker("RDS-A")).toBe("RDS-A");
  });
  it("rejects junk", () => {
    expect(cleanTicker("")).toBeNull();
    expect(cleanTicker(null)).toBeNull();
    expect(cleanTicker("TOOLONGX")).toBeNull();
    expect(cleanTicker("A.B.C")).toBeNull();
    expect(cleanTicker("123")).toBeNull();
  });
});

describe("cleanKeyword", () => {
  it("keeps normal multi-word keywords", () => {
    expect(cleanKeyword("coconut water")).toBe("coconut water");
    expect(cleanKeyword("  e.l.f.  cosmetics ")).toBe("e.l.f. cosmetics");
  });
  it("rejects empty or overlong input", () => {
    expect(cleanKeyword("")).toBeNull();
    expect(cleanKeyword(null)).toBeNull();
    expect(cleanKeyword("x".repeat(61))).toBeNull();
  });
  it("rejects control characters", () => {
    expect(cleanKeyword("bad" + String.fromCharCode(7) + "value")).toBeNull();
  });
});
