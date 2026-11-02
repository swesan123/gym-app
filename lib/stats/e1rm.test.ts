import { describe, expect, it } from "vitest";

import { effectiveLoad, estimateE1rm, estimateRepMax, estimateSetE1rm } from "./e1rm";

describe("estimateE1rm (Epley)", () => {
  it("computes weight × (1 + reps / 30)", () => {
    expect(estimateE1rm(100, 10)).toBeCloseTo(133.333, 3);
    expect(estimateE1rm(200, 5)).toBeCloseTo(233.333, 3);
  });

  it("returns the weight itself for a single rep", () => {
    expect(estimateE1rm(225, 1)).toBe(225);
  });

  it("returns null for missing or non-positive inputs", () => {
    expect(estimateE1rm(null, 5)).toBeNull();
    expect(estimateE1rm(100, null)).toBeNull();
    expect(estimateE1rm(undefined, undefined)).toBeNull();
    expect(estimateE1rm(0, 5)).toBeNull();
    expect(estimateE1rm(100, 0)).toBeNull();
    expect(estimateE1rm(-10, 5)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(estimateE1rm(Number.NaN, 5)).toBeNull();
    expect(estimateE1rm(100, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("estimateRepMax", () => {
  it("maps a set back to its own weight at the same reps", () => {
    expect(estimateRepMax(100, 10, 10)).toBeCloseTo(100, 6);
  });

  it("equals e1RM for a target of one rep", () => {
    expect(estimateRepMax(100, 10, 1)).toBeCloseTo(133.333, 3);
  });

  it("estimates a lighter load for higher target reps", () => {
    expect(estimateRepMax(100, 5, 10)).toBeCloseTo((100 * (1 + 5 / 30)) / (1 + 10 / 30), 6);
  });

  it("returns null for invalid inputs or target", () => {
    expect(estimateRepMax(100, 5, 0)).toBeNull();
    expect(estimateRepMax(100, 5, null)).toBeNull();
    expect(estimateRepMax(null, 5, 8)).toBeNull();
    expect(estimateRepMax(100, 0, 8)).toBeNull();
  });
});

describe("effectiveLoad", () => {
  it("weighted uses the logged weight", () => {
    expect(effectiveLoad("weighted", 135, 180)).toBe(135);
    expect(effectiveLoad("weighted", 135, null)).toBe(135);
    expect(effectiveLoad("weighted", null, 180)).toBeNull();
  });

  it("assisted subtracts the counterweight from body weight", () => {
    expect(effectiveLoad("assisted", 50, 180)).toBe(130);
  });

  it("assisted clamps at zero and needs both inputs", () => {
    expect(effectiveLoad("assisted", 200, 180)).toBe(0);
    expect(effectiveLoad("assisted", 50, null)).toBeNull();
    expect(effectiveLoad("assisted", null, 180)).toBeNull();
    expect(effectiveLoad("assisted", 50, 0)).toBeNull();
  });

  it("bodyweight adds extra load to body weight", () => {
    expect(effectiveLoad("bodyweight", 25, 180)).toBe(205);
    expect(effectiveLoad("bodyweight", null, 180)).toBe(180);
    expect(effectiveLoad("bodyweight", 25, null)).toBeNull();
  });

  it("timed has no load", () => {
    expect(effectiveLoad("timed", 50, 180)).toBeNull();
  });

  it("rejects negative or non-finite weights", () => {
    expect(effectiveLoad("weighted", -5, 180)).toBeNull();
    expect(effectiveLoad("bodyweight", Number.NaN, 180)).toBeNull();
    expect(effectiveLoad("weighted", 100, Number.NaN)).toBeNull();
  });
});

describe("estimateSetE1rm", () => {
  it("uses effective load for assisted sets", () => {
    expect(estimateSetE1rm("assisted", { weight: 50, reps: 10 }, 180)).toBeCloseTo(
      130 * (1 + 10 / 30),
      6,
    );
  });

  it("uses body weight plus extra for bodyweight sets", () => {
    expect(estimateSetE1rm("bodyweight", { weight: 20, reps: 6 }, 180)).toBeCloseTo(
      200 * (1 + 6 / 30),
      6,
    );
  });

  it("is null for timed sets and missing reps", () => {
    expect(estimateSetE1rm("timed", { weight: 50, reps: 10 }, 180)).toBeNull();
    expect(estimateSetE1rm("weighted", { weight: 50, reps: null }, 180)).toBeNull();
  });
});
