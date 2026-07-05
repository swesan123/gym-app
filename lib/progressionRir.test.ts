import { describe, expect, it } from "vitest";

import {
  progressionOverloadPctToApply,
  resolveProgressionDirection,
  resolveSetProgressionDirection,
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

describe("resolveProgressionDirection", () => {
  const base = { defaultSets: 3, defaultReps: 10 };

  it("returns increase when all sets pass reps and RIR gate", () => {
    const sets = [
      { reps: 10, rir: 3 },
      { reps: 12, rir: 4 },
      { reps: 11, rir: 3 },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("increase");
  });

  it("returns decrease when any set has reps < default AND rir <= 1", () => {
    const sets = [
      { reps: 8, rir: 1 },
      { reps: 10, rir: 3 },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("decrease");
  });

  it("returns none when reps are low but RIR is high (form break, not fatigue)", () => {
    const sets = [
      { reps: 8, rir: 3 },
      { reps: 10, rir: 3 },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("none");
  });

  it("returns none when sets are insufficient for increase even if all pass", () => {
    const sets = [
      { reps: 12, rir: 3 },
      { reps: 12, rir: 3 },
    ];
    // Only 2 sets but defaultSets is 3
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("none");
  });

  it("returns none for empty set list", () => {
    expect(resolveProgressionDirection({ latestSets: [], ...base })).toBe("none");
  });

  it("null RIR counts as 0 — blocks increase", () => {
    const sets = [
      { reps: 12, rir: null },
      { reps: 12, rir: null },
      { reps: 12, rir: null },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("none");
  });

  it("null RIR counts as 0 — triggers decrease when reps also fail", () => {
    const sets = [
      { reps: 8, rir: null },
      { reps: 10, rir: 3 },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("decrease");
  });

  it("defaultReps null treated as 0 — increase fires when rir gate passes", () => {
    const sets = [{ reps: 10, rir: 3 }];
    // defaultReps null → 0; reps (10) >= 0 ✓; rir (3) >= 2 ✓ → increase
    expect(
      resolveProgressionDirection({ latestSets: sets, defaultSets: 1, defaultReps: null }),
    ).toBe("increase");
  });

  it("defaultReps null treated as 0 — decrease never fires (reps can't be < 0)", () => {
    const sets = [{ reps: 0, rir: 0 }];
    // reps (0) < defaultReps (0) is false → cannot trigger decrease
    expect(
      resolveProgressionDirection({ latestSets: sets, defaultSets: 1, defaultReps: null }),
    ).toBe("none");
  });

  it("increases when rir equals target exactly (>=, not strictly >)", () => {
    const sets = [
      { reps: 10, rir: 2 },
      { reps: 10, rir: 2 },
      { reps: 10, rir: 2 },
    ];
    expect(resolveProgressionDirection({ latestSets: sets, ...base })).toBe("increase");
  });
});

describe("resolveSetProgressionDirection", () => {
  // Repro from issue #70: Seated Bicep Curl, last Pull session was
  // reps 10 / weight 55 / RIR 3, 2, 2 — all three sets should increase
  // since RIR 2 now meets the target (>= 2), not the old strict > 2, and
  // one set's performance no longer blocks the others.
  it("increases every set in the bicep curl repro (RIR 3, 2, 2 at target reps)", () => {
    const defaultReps = 10;
    const sets = [
      { reps: 10, rir: 3 },
      { reps: 10, rir: 2 },
      { reps: 10, rir: 2 },
    ];
    for (const set of sets) {
      expect(
        resolveSetProgressionDirection(set, defaultReps, SMART_PROGRESSION_RIR_TARGET),
      ).toBe("increase");
    }
  });

  it("evaluates each set independently — a failing set does not block others", () => {
    const defaultReps = 10;
    expect(
      resolveSetProgressionDirection(
        { reps: 10, rir: 1 },
        defaultReps,
        SMART_PROGRESSION_RIR_TARGET,
      ),
    ).toBe("none");
    expect(
      resolveSetProgressionDirection(
        { reps: 10, rir: 3 },
        defaultReps,
        SMART_PROGRESSION_RIR_TARGET,
      ),
    ).toBe("increase");
    expect(
      resolveSetProgressionDirection(
        { reps: 10, rir: 2 },
        defaultReps,
        SMART_PROGRESSION_RIR_TARGET,
      ),
    ).toBe("increase");
  });

  it("decreases when reps fall short and RIR is 1 or below", () => {
    expect(
      resolveSetProgressionDirection({ reps: 8, rir: 0 }, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("decrease");
    expect(
      resolveSetProgressionDirection({ reps: 8, rir: 1 }, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("decrease");
  });

  it("coerces null RIR to 0 rather than treating it as unknown", () => {
    expect(
      resolveSetProgressionDirection({ reps: 8, rir: null }, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("decrease");
    expect(
      resolveSetProgressionDirection({ reps: 10, rir: null }, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("none");
  });

  it("returns none when there is no prior set performance", () => {
    expect(resolveSetProgressionDirection(null, 10, SMART_PROGRESSION_RIR_TARGET)).toBe("none");
    expect(
      resolveSetProgressionDirection(undefined, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("none");
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
