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
    ).toBe(true);
  });

  it("bodyweight stretch at 0 extra weight with empty presets is ready", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "bodyweight",
        stretch_kind: "static",
        reps: 10,
        weight: 0,
        rir: null,
        duration_seconds: null,
      }),
    ).toBe(true);
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

  it("dynamic stretch (timed) does not require RIR", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "timed",
        stretch_kind: "dynamic",
        reps: null,
        weight: null,
        rir: null,
        duration_seconds: 30,
      }),
    ).toBe(true);
  });

  it("static stretch (bodyweight, with extra weight filled) does not require RIR", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "bodyweight",
        stretch_kind: "static",
        reps: 10,
        weight: 0,
        rir: null,
        duration_seconds: null,
      }),
    ).toBe(true);
  });

  it("static stretch still requires reps", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "timed",
        stretch_kind: "static",
        reps: null,
        weight: null,
        rir: null,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("non-stretch (stretch_kind none) still requires RIR", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "weighted",
        stretch_kind: "none",
        reps: 10,
        weight: 50,
        rir: null,
        duration_seconds: null,
      }),
    ).toBe(false);
  });

  it("timed dynamic stretch requires duration but not RIR", () => {
    expect(
      isSetReadyToComplete({
        tracking_type: "timed",
        stretch_kind: "dynamic",
        reps: null,
        weight: null,
        rir: null,
        duration_seconds: 30,
      }),
    ).toBe(true);
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
