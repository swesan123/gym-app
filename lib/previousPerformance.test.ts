import { describe, expect, it } from "vitest";

import {
  pickLatestWorkoutPerExercise,
  pickMostRecentByKey,
  rankWorkoutsByRecency,
} from "@/lib/previousPerformance";
import { resolveSetProgressionDirection, SMART_PROGRESSION_RIR_TARGET } from "@/lib/progressionRir";

describe("rankWorkoutsByRecency", () => {
  it("ranks the first workout id as most recent (rank 0)", () => {
    const rank = rankWorkoutsByRecency(["w-newest", "w-older"]);
    expect(rank.get("w-newest")).toBe(0);
    expect(rank.get("w-older")).toBe(1);
  });
});

describe("pickLatestWorkoutPerExercise (#91 — progression must follow recency, not split)", () => {
  it("picks the most recent workout for an exercise even though it queried across two different splits", () => {
    // Legs split workout from an earlier week, then the exercise was moved
    // to a brand-new split and logged again more recently. Neither row
    // carries a split — this is queried purely by recency across all of the
    // exercise's history, so a newly created split can't hide it.
    const rankByWorkoutId = rankWorkoutsByRecency(["w-new-split", "w-legs-old"]);
    const rows = [
      { workout_id: "w-legs-old", exercise_id: "leg-press" },
      { workout_id: "w-new-split", exercise_id: "leg-press" },
    ];
    const latestWorkoutByExercise = pickLatestWorkoutPerExercise(rows, rankByWorkoutId);
    expect(latestWorkoutByExercise.get("leg-press")).toBe("w-new-split");
  });

  it("feeds resolveSetProgressionDirection with the correct latest set, yielding increase", () => {
    const rankByWorkoutId = rankWorkoutsByRecency(["w-new-split", "w-legs-old"]);
    const rows = [
      { workout_id: "w-legs-old", exercise_id: "leg-press" },
      { workout_id: "w-new-split", exercise_id: "leg-press" },
    ];
    const latestWorkoutByExercise = pickLatestWorkoutPerExercise(rows, rankByWorkoutId);

    // Simulate the two candidate sets: the old split's set failed the gate,
    // the new split's set passes it. Only the winning workout's set should
    // reach the progression check.
    const setsByWorkout: Record<string, { reps: number; rir: number }> = {
      "w-legs-old": { reps: 8, rir: 0 },
      "w-new-split": { reps: 10, rir: 3 },
    };
    const winningWorkoutId = latestWorkoutByExercise.get("leg-press");
    const latestSet = winningWorkoutId ? setsByWorkout[winningWorkoutId] : null;

    expect(
      resolveSetProgressionDirection(latestSet, 10, SMART_PROGRESSION_RIR_TARGET),
    ).toBe("increase");
  });
});

describe("pickMostRecentByKey (#92 — bodyweight null weight must not be shadowed by an older logged weight)", () => {
  it("prefers the most recent session's 0 extra weight over an older session's logged weight", () => {
    // Repro: leg raises logged extra weight 10 on 2026-07-07, then 0 extra
    // (stored as null) on the more recent 2026-07-19 session. Prefill should
    // carry forward 0, not the stale 10.
    const rankByWorkoutId = rankWorkoutsByRecency(["w-jul19", "w-jul07"]);
    const rows = [
      { workout_id: "w-jul07", key: "leg-raises:1", value: 10 },
      { workout_id: "w-jul19", key: "leg-raises:1", value: 0 },
    ];
    const picked = pickMostRecentByKey(rows, rankByWorkoutId);
    expect(picked.get("leg-raises:1")).toBe(0);
  });

  it("still prefers the most recent non-null weight when both sessions logged one", () => {
    const rankByWorkoutId = rankWorkoutsByRecency(["w-newest", "w-older"]);
    const rows = [
      { workout_id: "w-older", key: "bench:1", value: 100 },
      { workout_id: "w-newest", key: "bench:1", value: 105 },
    ];
    const picked = pickMostRecentByKey(rows, rankByWorkoutId);
    expect(picked.get("bench:1")).toBe(105);
  });
});
