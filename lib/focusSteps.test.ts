import { describe, expect, it } from "vitest";

import { buildFocusSteps } from "@/components/workout/focusSteps";
import type { SummaryExercise } from "@/components/workout/WorkoutSummary";

function makeGroup(
  overrides: Partial<SummaryExercise> & { exercise_id: string },
): SummaryExercise {
  return {
    exercise_id: overrides.exercise_id,
    exercise_name: overrides.exercise_name ?? overrides.exercise_id,
    tracking_type: overrides.tracking_type ?? "weighted",
    stretch_kind: overrides.stretch_kind ?? "none",
    rest_seconds: overrides.rest_seconds ?? null,
    sets: overrides.sets ?? [],
  };
}

function makeSet(id: string, set_number: number) {
  return {
    id,
    set_number,
    reps: 10,
    weight: 50,
    rir: 2,
    duration_seconds: null,
    volume: 500,
    note: null,
    set_type: "working" as const,
    completed_at: null,
    started_at: null,
  };
}

describe("buildFocusSteps", () => {
  it("flattens sets in set_number order within an exercise", () => {
    const groups = [
      makeGroup({
        exercise_id: "ex1",
        sets: [makeSet("s2", 2), makeSet("s1", 1)],
      }),
    ];
    const steps = buildFocusSteps(groups);
    expect(steps.map((s) => s.setId)).toEqual(["s1", "s2"]);
    expect(steps[0].setIndexInExercise).toBe(0);
    expect(steps[1].setIndexInExercise).toBe(1);
  });

  it("orders dynamic stretches before main before static", () => {
    const groups = [
      makeGroup({
        exercise_id: "main1",
        stretch_kind: "none",
        sets: [makeSet("m1", 1)],
      }),
      makeGroup({
        exercise_id: "static1",
        stretch_kind: "static",
        sets: [makeSet("st1", 1)],
      }),
      makeGroup({
        exercise_id: "dyn1",
        stretch_kind: "dynamic",
        sets: [makeSet("d1", 1)],
      }),
    ];
    const steps = buildFocusSteps(groups);
    expect(steps.map((s) => s.setId)).toEqual(["d1", "m1", "st1"]);
  });

  it("flags the last set of each exercise", () => {
    const groups = [
      makeGroup({
        exercise_id: "ex1",
        sets: [makeSet("s1", 1), makeSet("s2", 2)],
      }),
    ];
    const steps = buildFocusSteps(groups);
    expect(steps[0].isLastSetOfExercise).toBe(false);
    expect(steps[1].isLastSetOfExercise).toBe(true);
  });

  it("flags only the very last step of the whole workout", () => {
    const groups = [
      makeGroup({ exercise_id: "ex1", sets: [makeSet("s1", 1)] }),
      makeGroup({ exercise_id: "ex2", sets: [makeSet("s2", 1)] }),
    ];
    const steps = buildFocusSteps(groups);
    expect(steps[0].isLastStepOfWorkout).toBe(false);
    expect(steps[1].isLastStepOfWorkout).toBe(true);
  });

  it("returns an empty array for no groups", () => {
    expect(buildFocusSteps([])).toEqual([]);
  });
});
