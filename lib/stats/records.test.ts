import { describe, expect, it } from "vitest";

import { computePersonalRecords, type RecordSetInput } from "./records";

const set = (overrides: Partial<RecordSetInput> = {}): RecordSetInput => ({
  date: "2026-01-01",
  weight: 100,
  reps: 5,
  volume: 500,
  setType: "working",
  completedAt: "2026-01-01T10:00:00Z",
  ...overrides,
});

const weightedOpts = {
  exercise: "Bench Press",
  trackingType: "weighted",
  bodyWeight: 180,
} as const;

describe("computePersonalRecords weighted", () => {
  it("returns all nulls with no sets", () => {
    expect(computePersonalRecords([], weightedOpts)).toEqual({
      exercise: "Bench Press",
      trackingType: "weighted",
      heaviestWeight: null,
      bestE1rm: null,
      mostReps: null,
      bestSetVolume: null,
    });
  });

  it("finds each record across sets", () => {
    const result = computePersonalRecords(
      [
        set({ date: "2026-01-01", weight: 100, reps: 10, volume: 1000 }),
        set({ date: "2026-01-08", weight: 120, reps: 3, volume: 360 }),
        set({ date: "2026-01-15", weight: 80, reps: 15, volume: 1200 }),
      ],
      weightedOpts,
    );
    expect(result.heaviestWeight).toEqual({ value: 120, weight: 120, reps: 3, date: "2026-01-08" });
    expect(result.bestE1rm).toEqual({ value: 133.3, weight: 100, reps: 10, date: "2026-01-01" });
    expect(result.mostReps).toEqual({ value: 15, weight: 80, reps: 15, date: "2026-01-15" });
    expect(result.bestSetVolume).toEqual({ value: 1200, weight: 80, reps: 15, date: "2026-01-15" });
  });

  it("rounds e1RM to one decimal", () => {
    const result = computePersonalRecords([set({ weight: 100, reps: 10 })], weightedOpts);
    expect(result.bestE1rm?.value).toBe(133.3);
  });

  it("e1RM of a single rep equals the weight", () => {
    const result = computePersonalRecords([set({ weight: 225, reps: 1, volume: 225 })], weightedOpts);
    expect(result.bestE1rm?.value).toBe(225);
  });

  it("excludes warm-up sets", () => {
    const result = computePersonalRecords(
      [
        set({ weight: 200, reps: 20, volume: 4000, setType: "warmup" }),
        set({ weight: 100, reps: 5, volume: 500 }),
      ],
      weightedOpts,
    );
    expect(result.heaviestWeight?.value).toBe(100);
    expect(result.mostReps?.value).toBe(5);
    expect(result.bestSetVolume?.value).toBe(500);
  });

  it("excludes sets that are not completed", () => {
    const result = computePersonalRecords(
      [set({ weight: 300, reps: 5, volume: 1500, completedAt: null })],
      weightedOpts,
    );
    expect(result.heaviestWeight).toBeNull();
    expect(result.bestE1rm).toBeNull();
  });

  it("keeps the earliest date on ties regardless of input order", () => {
    const result = computePersonalRecords(
      [
        set({ date: "2026-03-01", weight: 100, reps: 5, volume: 500 }),
        set({ date: "2026-01-01", weight: 100, reps: 5, volume: 500 }),
        set({ date: "2026-02-01", weight: 100, reps: 5, volume: 500 }),
      ],
      weightedOpts,
    );
    expect(result.heaviestWeight?.date).toBe("2026-01-01");
    expect(result.bestE1rm?.date).toBe("2026-01-01");
    expect(result.mostReps?.date).toBe("2026-01-01");
    expect(result.bestSetVolume?.date).toBe("2026-01-01");
  });

  it("keeps the earliest set on a same-day tie using completion time", () => {
    const result = computePersonalRecords(
      [
        set({ weight: 100, reps: 8, completedAt: "2026-01-01T11:00:00Z" }),
        set({ weight: 100, reps: 5, completedAt: "2026-01-01T10:00:00Z" }),
        set({ weight: 100, reps: 3, completedAt: "2026-01-01T09:00:00Z" }),
      ],
      weightedOpts,
    );
    expect(result.heaviestWeight?.reps).toBe(3);
  });

  it("ignores sets with missing or zero weight or reps", () => {
    const result = computePersonalRecords(
      [
        set({ weight: null, reps: 5, volume: null }),
        set({ weight: 0, reps: 10, volume: 0 }),
      ],
      weightedOpts,
    );
    expect(result.heaviestWeight).toBeNull();
    expect(result.bestE1rm).toBeNull();
    expect(result.bestSetVolume).toBeNull();
    expect(result.mostReps?.value).toBe(10);
  });

  it("records heaviest weight but no e1RM when reps are missing", () => {
    const result = computePersonalRecords(
      [set({ weight: 100, reps: null, volume: null })],
      weightedOpts,
    );
    expect(result.heaviestWeight?.value).toBe(100);
    expect(result.bestE1rm).toBeNull();
    expect(result.mostReps).toBeNull();
  });

  it("recomputes volume when the stored volume is null", () => {
    const result = computePersonalRecords([set({ weight: 50, reps: 10, volume: null })], weightedOpts);
    expect(result.bestSetVolume?.value).toBe(500);
  });

  it("does not mutate the input", () => {
    const input = [
      set({ date: "2026-02-01" }),
      set({ date: "2026-01-01" }),
    ];
    computePersonalRecords(input, weightedOpts);
    expect(input.map((s) => s.date)).toEqual(["2026-02-01", "2026-01-01"]);
  });
});

describe("computePersonalRecords assisted", () => {
  const opts = { exercise: "Assisted Pull-up", trackingType: "assisted", bodyWeight: 180 } as const;

  it("uses effective load (body weight minus assistance)", () => {
    const result = computePersonalRecords(
      [
        set({ weight: 60, reps: 8, volume: 960 }),
        set({ date: "2026-01-08", weight: 40, reps: 6, volume: 840 }),
      ],
      opts,
    );
    expect(result.heaviestWeight).toEqual({ value: 140, weight: 40, reps: 6, date: "2026-01-08" });
    expect(result.bestE1rm?.value).toBe(168);
    expect(result.mostReps?.value).toBe(8);
    expect(result.bestSetVolume?.value).toBe(960);
  });

  it("skips load records without body weight but keeps reps and volume", () => {
    const result = computePersonalRecords([set({ weight: 60, reps: 8, volume: 960 })], {
      ...opts,
      bodyWeight: null,
    });
    expect(result.heaviestWeight).toBeNull();
    expect(result.bestE1rm).toBeNull();
    expect(result.mostReps?.value).toBe(8);
    expect(result.bestSetVolume?.value).toBe(960);
  });
});

describe("computePersonalRecords bodyweight", () => {
  const opts = { exercise: "Pull-up", trackingType: "bodyweight", bodyWeight: 180 } as const;

  it("adds body weight to the extra load", () => {
    const result = computePersonalRecords(
      [
        set({ weight: null, reps: 12, volume: 2160 }),
        set({ date: "2026-01-08", weight: 20, reps: 5, volume: 1000 }),
      ],
      opts,
    );
    expect(result.heaviestWeight).toEqual({ value: 200, weight: 20, reps: 5, date: "2026-01-08" });
    expect(result.mostReps).toEqual({ value: 12, weight: null, reps: 12, date: "2026-01-01" });
    expect(result.bestSetVolume?.value).toBe(2160);
    expect(result.bestE1rm?.value).toBe(252);
  });

  it("falls back to reps only when body weight is unknown and volume missing", () => {
    const result = computePersonalRecords([set({ weight: null, reps: 10, volume: null })], {
      ...opts,
      bodyWeight: null,
    });
    expect(result.heaviestWeight).toBeNull();
    expect(result.bestSetVolume).toBeNull();
    expect(result.mostReps?.value).toBe(10);
  });
});

describe("computePersonalRecords timed", () => {
  it("returns no records", () => {
    const result = computePersonalRecords(
      [set({ weight: 20, reps: 60, volume: null })],
      { exercise: "Plank", trackingType: "timed", bodyWeight: 180 },
    );
    expect(result).toEqual({
      exercise: "Plank",
      trackingType: "timed",
      heaviestWeight: null,
      bestE1rm: null,
      mostReps: null,
      bestSetVolume: null,
    });
  });
});
