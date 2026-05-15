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

  it("orders RIR 4 above RIR 3 for same exercise base", () => {
    expect(rirOverloadMultiplier(4)).toBeGreaterThan(rirOverloadMultiplier(3));
  });
});

describe("progressionOverloadPctToApply", () => {
  it("returns 0 when progression gate fails", () => {
    expect(
      progressionOverloadPctToApply({
        exercisePct: 3,
        progressionPassed: false,
        rir: 4,
      }),
    ).toBe(0);
  });

  it("uses exercise pct scaled by RIR multiplier", () => {
    const pct = progressionOverloadPctToApply({
      exercisePct: 5,
      progressionPassed: true,
      rir: 4,
    });
    expect(pct).toBeCloseTo(5 * rirOverloadMultiplier(4));
  });

  it("higher RIR yields larger pct than lower RIR for same exercise base", () => {
    const base = 2.5;
    const at3 = progressionOverloadPctToApply({
      exercisePct: base,
      progressionPassed: true,
      rir: 3,
    });
    const at4 = progressionOverloadPctToApply({
      exercisePct: base,
      progressionPassed: true,
      rir: 4,
    });
    expect(at4).toBeGreaterThan(at3);
  });
});
