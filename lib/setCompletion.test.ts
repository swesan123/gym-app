import { describe, expect, it } from "vitest";

import { incompleteSets, isSetReadyToComplete } from "./setCompletion";

describe("isSetReadyToComplete", () => {
  it("requires reps, weight, and rir for weighted exercises", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "weighted",
        reps: 10,
        weight: 50,
        rir: 2,
        duration_seconds: null,
      }),
    ).toBe(true);
  });

  it("fails when reps missing", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "weighted",
        reps: null,
        weight: 50,
        rir: 2,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("fails when weight missing for weighted exercise", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "weighted",
        reps: 10,
        weight: null,
        rir: 2,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("fails when rir missing", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "weighted",
        reps: 10,
        weight: 50,
        rir: null,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("does not require weight for bodyweight-without-extra tracking", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "bodyweight",
        reps: 10,
        weight: null,
        rir: 2,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("uses duration instead of reps for timed exercises", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "timed",
        reps: null,
        weight: null,
        rir: 2,
        duration_seconds: 30,
      }),
    ).toBe(true);
  });

  it("timed exercises still require duration", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "timed",
        reps: null,
        weight: null,
        rir: 2,
        duration_seconds: null,
      }),
    ).toBe(false);
  });
});

describe("incompleteSets", () => {
  it("excludes warmup sets from the incomplete list", () => {
    const sets = [
      {
        tracking_type: "weighted",
        reps: null,
        weight: null,
        rir: null,
        duration_seconds: null,
        set_type: "warmup",
      },
      {
        tracking_type: "weighted",
        reps: 10,
        weight: 50,
        rir: 2,
        duration_seconds: null,
        set_type: "working",
      },
    ];
    expect(incompleteSets(sets)).toEqual([]);
  });

  it("flags working sets missing required fields", () => {
    const sets = [
      {
        tracking_type: "weighted",
        reps: 10,
        weight: null,
        rir: null,
        duration_seconds: null,
        set_type: "working",
      },
    ];
    expect(incompleteSets(sets)).toHaveLength(1);
  });
});
