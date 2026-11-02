import { describe, expect, it } from "vitest";

import type { LoadAdjustment } from "./loadAdjustment";
import {
  applyCutToWeight,
  daysBetween,
  planReturnAdjustment,
  type ApplyCutInput,
  type PlanReturnInput,
} from "./returnFromBreak";

const plan = (overrides: Partial<PlanReturnInput> = {}) =>
  planReturnAdjustment({
    gapDays: 30,
    previousAdjustment: null,
    lastSessionWorkingRirs: [],
    lastWeightsBySet: { "1": 100, "2": 100 },
    ...overrides,
  });

const adjustment = (overrides: Partial<LoadAdjustment> = {}): LoadAdjustment => ({
  phase: "first-session",
  gapDays: 30,
  cutPct: 10,
  holdProgression: true,
  dropOneSet: true,
  targetRir: 3,
  referenceWeights: { "1": 100, "2": 100 },
  overridden: false,
  ...overrides,
});

describe("daysBetween", () => {
  it("counts whole UTC days", () => {
    expect(daysBetween("2026-01-01", "2026-01-15")).toBe(14);
  });

  it("is zero for the same day", () => {
    expect(daysBetween("2026-03-05", "2026-03-05")).toBe(0);
  });

  it("handles month and year boundaries", () => {
    expect(daysBetween("2025-12-30", "2026-01-02")).toBe(3);
  });

  it("is not thrown off by daylight saving changes", () => {
    expect(daysBetween("2026-03-01", "2026-03-20")).toBe(19);
  });
});

describe("planReturnAdjustment tiers", () => {
  it("does not adjust below 14 days", () => {
    expect(plan({ gapDays: 13 })).toBeNull();
  });

  it("holds the weight from 14 days", () => {
    expect(plan({ gapDays: 14 })).toMatchObject({
      phase: "hold",
      cutPct: 0,
      holdProgression: true,
      dropOneSet: false,
      targetRir: 2,
    });
  });

  it("still holds at 27 days", () => {
    expect(plan({ gapDays: 27 })).toMatchObject({ phase: "hold", cutPct: 0 });
  });

  it("cuts 10% and drops a set from 28 days", () => {
    expect(plan({ gapDays: 28 })).toMatchObject({
      phase: "first-session",
      cutPct: 10,
      dropOneSet: true,
      targetRir: 3,
    });
  });

  it("still cuts 10% at 55 days", () => {
    expect(plan({ gapDays: 55 })).toMatchObject({ cutPct: 10 });
  });

  it("cuts 15% from 56 days", () => {
    expect(plan({ gapDays: 56 })).toMatchObject({ cutPct: 15, targetRir: 3 });
  });

  it("still cuts 15% at 111 days", () => {
    expect(plan({ gapDays: 111 })).toMatchObject({ cutPct: 15 });
  });

  it("caps the cut at 20% from 112 days with target RIR 4", () => {
    expect(plan({ gapDays: 112 })).toMatchObject({ cutPct: 20, targetRir: 4, dropOneSet: true });
    expect(plan({ gapDays: 400 })).toMatchObject({ cutPct: 20 });
  });

  it("handles the owner's 52-day case", () => {
    expect(plan({ gapDays: 52 })).toMatchObject({
      phase: "first-session",
      gapDays: 52,
      cutPct: 10,
      dropOneSet: true,
      targetRir: 3,
      overridden: false,
    });
  });

  it("records the pre-break weights as the reference", () => {
    expect(plan({ gapDays: 52, lastWeightsBySet: { "1": 80, "3": 70 } })?.referenceWeights).toEqual({
      "1": 80,
      "3": 70,
    });
  });

  it("never adjusts an exercise without history", () => {
    expect(plan({ gapDays: null })).toBeNull();
    expect(plan({ gapDays: null, overridePct: 15 })).toBeNull();
  });
});

describe("planReturnAdjustment ramp", () => {
  it("steps a 10% cut down to 5%", () => {
    const next = plan({ gapDays: 3, previousAdjustment: adjustment({ cutPct: 10 }) });
    expect(next).toMatchObject({
      phase: "ramp",
      cutPct: 5,
      holdProgression: true,
      dropOneSet: false,
      targetRir: 2,
    });
  });

  it("steps 5% down to 0% with the weight back at reference", () => {
    const next = plan({
      gapDays: 3,
      previousAdjustment: adjustment({ phase: "ramp", cutPct: 5 }),
    });
    expect(next).toMatchObject({ phase: "ramp", cutPct: 0, holdProgression: true });
  });

  it("resumes normal progression after the ramp reaches 0%", () => {
    expect(
      plan({ gapDays: 3, previousAdjustment: adjustment({ phase: "ramp", cutPct: 0 }) }),
    ).toBeNull();
  });

  it("ramps 15 -> 10 -> 5 -> 0 -> normal", () => {
    let current: LoadAdjustment | null = adjustment({ cutPct: 15 });
    const cuts: number[] = [];
    while (current) {
      current = plan({ gapDays: 3, previousAdjustment: current });
      if (current) cuts.push(current.cutPct);
    }
    expect(cuts).toEqual([10, 5, 0]);
  });

  it("carries the reference weights through the ramp", () => {
    const next = plan({
      gapDays: 3,
      lastWeightsBySet: { "1": 90 },
      previousAdjustment: adjustment({ referenceWeights: { "1": 100 } }),
    });
    expect(next?.referenceWeights).toEqual({ "1": 100 });
  });

  it("returns to full weight right away when every working set had 4+ RIR", () => {
    const next = plan({
      gapDays: 3,
      lastSessionWorkingRirs: [4, 5, 4],
      previousAdjustment: adjustment({ cutPct: 15 }),
    });
    expect(next).toMatchObject({ phase: "ramp", cutPct: 0 });
  });

  it("steps down normally when one set had only 3 RIR", () => {
    const next = plan({
      gapDays: 3,
      lastSessionWorkingRirs: [4, 3, 4],
      previousAdjustment: adjustment({ cutPct: 15 }),
    });
    expect(next?.cutPct).toBe(10);
  });

  it("does not jump when some RIRs were not logged", () => {
    const next = plan({
      gapDays: 3,
      lastSessionWorkingRirs: [4, null, 5],
      previousAdjustment: adjustment({ cutPct: 15 }),
    });
    expect(next?.cutPct).toBe(10);
  });

  it("does not jump when there were no completed working sets", () => {
    const next = plan({
      gapDays: 3,
      lastSessionWorkingRirs: [],
      previousAdjustment: adjustment({ cutPct: 15 }),
    });
    expect(next?.cutPct).toBe(10);
  });

  it("keeps the cut when another 14-27 day break interrupts the ramp", () => {
    const next = plan({
      gapDays: 20,
      previousAdjustment: adjustment({ phase: "ramp", cutPct: 10 }),
    });
    expect(next).toMatchObject({
      phase: "ramp",
      cutPct: 10,
      holdProgression: true,
      dropOneSet: false,
      referenceWeights: { "1": 100, "2": 100 },
    });
  });

  it("takes the larger cut when a 28+ day break interrupts the ramp", () => {
    const next = plan({
      gapDays: 60,
      lastWeightsBySet: { "1": 90 },
      previousAdjustment: adjustment({ phase: "ramp", cutPct: 20, referenceWeights: { "1": 100 } }),
    });
    expect(next).toMatchObject({
      phase: "first-session",
      cutPct: 20,
      dropOneSet: true,
      referenceWeights: { "1": 100 },
    });
  });

  it("uses the tier cut when it exceeds the interrupted ramp's cut", () => {
    const next = plan({
      gapDays: 120,
      previousAdjustment: adjustment({ phase: "ramp", cutPct: 5 }),
    });
    expect(next).toMatchObject({ cutPct: 20, targetRir: 4 });
  });

  it("treats a finished ramp as no previous adjustment after a new break", () => {
    const next = plan({
      gapDays: 30,
      lastWeightsBySet: { "1": 105 },
      previousAdjustment: adjustment({ phase: "ramp", cutPct: 0, referenceWeights: { "1": 100 } }),
    });
    expect(next).toMatchObject({ cutPct: 10, referenceWeights: { "1": 105 } });
  });
});

describe("planReturnAdjustment override", () => {
  it("applies an explicit cut and marks it overridden", () => {
    expect(plan({ gapDays: 30, overridePct: 15 })).toMatchObject({
      phase: "first-session",
      cutPct: 15,
      overridden: true,
      holdProgression: true,
      dropOneSet: true,
      targetRir: 3,
    });
  });

  it("applies an override even for a short gap, without dropping a set", () => {
    expect(plan({ gapDays: 5, overridePct: 10 })).toMatchObject({
      cutPct: 10,
      dropOneSet: false,
      targetRir: 3,
    });
  });

  it("uses target RIR 4 for an override after 112+ days", () => {
    expect(plan({ gapDays: 112, overridePct: 5 })?.targetRir).toBe(4);
  });

  it("carries the reference weights of an active adjustment", () => {
    const next = plan({
      gapDays: 3,
      overridePct: 15,
      lastWeightsBySet: { "1": 85 },
      previousAdjustment: adjustment({ referenceWeights: { "1": 100 } }),
    });
    expect(next?.referenceWeights).toEqual({ "1": 100 });
  });

  it("uses the last weights when no adjustment is active", () => {
    const next = plan({ gapDays: 30, overridePct: 15, lastWeightsBySet: { "1": 85 } });
    expect(next?.referenceWeights).toEqual({ "1": 85 });
  });

  it("returns no adjustment for an override of 0", () => {
    expect(plan({ gapDays: 100, overridePct: 0 })).toBeNull();
  });
});

describe("applyCutToWeight", () => {
  const base: ApplyCutInput = {
    trackingType: "weighted",
    referenceWeight: 100,
    cutPct: 10,
    grid: null,
    stepFallback: 2.5,
    bodyWeight: null,
  };
  const apply = (overrides: Partial<ApplyCutInput> = {}) => applyCutToWeight({ ...base, ...overrides });

  it("returns the reference unchanged for a 0% cut", () => {
    expect(apply({ cutPct: 0, referenceWeight: 57.5 })).toBe(57.5);
    expect(apply({ cutPct: 0, trackingType: "assisted", referenceWeight: 30, bodyWeight: 80 })).toBe(30);
  });

  it("floors a weighted cut to the 2.5 step", () => {
    expect(apply({ referenceWeight: 100, cutPct: 12 })).toBe(87.5);
  });

  it("floors a weighted cut to a custom step", () => {
    expect(apply({ referenceWeight: 100, cutPct: 12, stepFallback: 5 })).toBe(85);
  });

  it("floors a weighted cut onto the machine grid", () => {
    const grid = { start: 10, end: 100, increment: 10 };
    expect(apply({ referenceWeight: 70, cutPct: 15, grid })).toBe(50);
  });

  it("never goes below the grid start", () => {
    const grid = { start: 10, end: 100, increment: 10 };
    expect(apply({ referenceWeight: 10, cutPct: 20, grid })).toBe(10);
  });

  it("still lowers the weight by a full step for a small cut (no grid)", () => {
    expect(apply({ referenceWeight: 20, cutPct: 5 })).toBe(17.5);
  });

  it("still lowers the weight by a full grid step for a small cut", () => {
    const grid = { start: 5, end: 100, increment: 5 };
    expect(apply({ referenceWeight: 20, cutPct: 5, grid })).toBe(15);
  });

  it("never returns a negative weight", () => {
    expect(apply({ referenceWeight: 2, cutPct: 20 })).toBe(0);
  });

  it("makes bodyweight extra load lighter, using body weight when known", () => {
    // reduce = 10% of (80 + 20) = 10 -> extra 10
    expect(apply({ trackingType: "bodyweight", referenceWeight: 20, bodyWeight: 80 })).toBe(10);
  });

  it("scales bodyweight extra load directly without body weight", () => {
    // 20 * 0.9 = 18 -> floored to 17.5
    expect(apply({ trackingType: "bodyweight", referenceWeight: 20 })).toBe(17.5);
  });

  it("clamps bodyweight extra at zero when the cut exceeds the extra load", () => {
    expect(apply({ trackingType: "bodyweight", referenceWeight: 5, cutPct: 20, bodyWeight: 80 })).toBe(0);
  });

  it("keeps bodyweight with no extra load at 0", () => {
    expect(apply({ trackingType: "bodyweight", referenceWeight: 0, bodyWeight: 80 })).toBe(0);
    expect(apply({ trackingType: "bodyweight", referenceWeight: 0 })).toBe(0);
  });

  it("adds assistance by effective load when body weight is known", () => {
    expect(apply({ trackingType: "assisted", referenceWeight: 30, bodyWeight: 80 })).toBe(35);
  });

  it("rounds assistance up to the grid and caps at the grid end", () => {
    const grid = { start: 5, end: 40, increment: 5 };
    expect(apply({ trackingType: "assisted", referenceWeight: 30, bodyWeight: 80, grid })).toBe(35);
    expect(apply({ trackingType: "assisted", referenceWeight: 38, bodyWeight: 80, cutPct: 20, grid })).toBe(40);
  });

  it("adds one extra step when assistance rounding cancels the cut", () => {
    // effective 10 -> 9.5 -> assist 70.5 -> ceil 72.5 on a 2.5 step, already > 70
    expect(apply({ trackingType: "assisted", referenceWeight: 70, bodyWeight: 80, cutPct: 5 })).toBe(72.5);
  });

  it("adds a step of assistance without body weight", () => {
    expect(apply({ trackingType: "assisted", referenceWeight: 30 })).toBe(32.5);
  });

  it("adds two steps of assistance for cuts above 10% without body weight", () => {
    expect(apply({ trackingType: "assisted", referenceWeight: 30, cutPct: 15 })).toBe(35);
  });

  it("caps assistance at the grid end without body weight", () => {
    const grid = { start: 5, end: 40, increment: 5 };
    expect(apply({ trackingType: "assisted", referenceWeight: 40, cutPct: 15, grid })).toBe(40);
  });

  it("leaves timed exercises unchanged", () => {
    expect(apply({ trackingType: "timed", referenceWeight: 30 })).toBe(30);
  });
});
