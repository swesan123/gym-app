import { describe, expect, it } from "vitest";

import {
  progressionOverloadPctToApply,
  rirOverloadMultiplier,
  SMART_PROGRESSION_RIR_TARGET,
} from "./progressionRir";

describe("rirOverloadMultiplier", () => {
  it("is 1 below target RIR", () => {
    expect(rirOverloadMultiplier(SMART_PROGRESSION_RIR_TARGET - 1)).toBe(1);
  });

  it("is 1 at target RIR", () => {
    expect(rirOverloadMultiplier(SMART_PROGRESSION_RIR_TARGET)).toBe(1);
  });

  it("increases above target RIR", () => {
    expect(rirOverloadMultiplier(4)).toBeGreaterThan(
      rirOverloadMultiplier(SMART_PROGRESSION_RIR_TARGET),
    );
  });
});

describe("progressionOverloadPctToApply", () => {
  it("returns 0 when progression gate fails", () => {
    expect(
      progressionOverloadPctToApply({
        profileBasePct: 5,
        exercisePct: 3,
        progressionPassed: false,
        rir: 4,
      }),
    ).toBe(0);
  });

  it("uses profile base when set", () => {
    const pct = progressionOverloadPctToApply({
      profileBasePct: 10,
      exercisePct: 5,
      progressionPassed: true,
      rir: 4,
    });
    expect(pct).toBeCloseTo(10 * rirOverloadMultiplier(4));
  });

  it("falls back to exercise pct when profile base is null", () => {
    const pct = progressionOverloadPctToApply({
      profileBasePct: null,
      exercisePct: 8,
      progressionPassed: true,
      rir: 3,
    });
    expect(pct).toBeCloseTo(8 * rirOverloadMultiplier(3));
  });
});
