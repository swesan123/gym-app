import { describe, expect, it } from "vitest";

import {
  formatCutRange,
  formatGap,
  summarizeLoadAdjustments,
  type LoadAdjustment,
} from "./loadAdjustment";

const adjustment = (overrides: Partial<LoadAdjustment> = {}): LoadAdjustment => ({
  phase: "first-session",
  gapDays: 52,
  cutPct: 10,
  holdProgression: true,
  dropOneSet: true,
  targetRir: 3,
  referenceWeights: { "1": 100 },
  overridden: false,
  ...overrides,
});

describe("summarizeLoadAdjustments", () => {
  it("returns null when nothing was adjusted", () => {
    expect(summarizeLoadAdjustments(null)).toBeNull();
    expect(summarizeLoadAdjustments({})).toBeNull();
  });

  it("aggregates gap, cut range, sets and target RIR across exercises", () => {
    const summary = summarizeLoadAdjustments({
      a: adjustment({ gapDays: 52, cutPct: 10 }),
      b: adjustment({ gapDays: 60, cutPct: 15 }),
      c: adjustment({ phase: "hold", gapDays: 20, cutPct: 0, dropOneSet: false, targetRir: 2 }),
    });
    expect(summary).toEqual({
      exercisesAdjusted: 3,
      maxGapDays: 60,
      minCutPct: 0,
      maxCutPct: 15,
      firstSessionBack: true,
      droppedSets: true,
      targetRir: 3,
      overridden: false,
    });
  });
});

describe("formatters", () => {
  it("formats a single cut or a range", () => {
    expect(formatCutRange({ minCutPct: 10, maxCutPct: 10 })).toBe("10%");
    expect(formatCutRange({ minCutPct: 10, maxCutPct: 15 })).toBe("10–15%");
  });

  it("formats gaps in days under two weeks, otherwise rounded weeks", () => {
    expect(formatGap(10)).toBe("10 days");
    expect(formatGap(52)).toBe("7 weeks");
  });
});
