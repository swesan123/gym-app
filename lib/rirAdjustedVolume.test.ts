import { describe, expect, it } from "vitest";

import { computeRirAdjustedVolume } from "./rirAdjustedVolume";

describe("computeRirAdjustedVolume", () => {
  it("applies RIR effort multiplier to volume", () => {
    // 10 × 100, RIR 3 → 1000 × 1/(1 - 0.09) = 1098.90…
    expect(computeRirAdjustedVolume(1000, 3)).toBeCloseTo(1098.901, 2);
  });

  it("reflects harder effort at same volume", () => {
    // 10 × 100, RIR 1 → 1000 × 1/(1 - 0.03) ≈ 1030.93
    expect(computeRirAdjustedVolume(1000, 1)).toBeCloseTo(1030.928, 2);
  });

  it("rewards more reps at hard effort", () => {
    // 12 × 100, RIR 1 → 1200 × 1/(1 - 0.03) ≈ 1237.11
    expect(computeRirAdjustedVolume(1200, 1)).toBeCloseTo(1237.113, 2);
  });

  it("treats null rir as plain volume", () => {
    expect(computeRirAdjustedVolume(1000, null)).toBe(1000);
  });

  it("returns null when volume missing", () => {
    expect(computeRirAdjustedVolume(null, 2)).toBeNull();
  });

  it("returns null when denominator is non-positive", () => {
    expect(computeRirAdjustedVolume(1000, 34)).toBeNull();
  });
});
