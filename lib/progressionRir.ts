/** Minimum RIR before smart progression applies (same as prior hard-coded gate). */
export const SMART_PROGRESSION_RIR_TARGET = 2;

/**
 * Scale overload % upward when the athlete finishes with more reps in reserve.
 * At RIR === target, multiplier is 1; each step above target adds 25% (capped at 3×)
 * so higher-RIR sets get visibly larger steps after machine-grid rounding.
 */
export function rirOverloadMultiplier(rir: number | null | undefined): number {
  if (rir == null || !Number.isFinite(rir)) return 1;
  if (rir < SMART_PROGRESSION_RIR_TARGET) return 1;
  return Math.min(
    3,
    1 +
      0.25 *
        (Number(rir) - SMART_PROGRESSION_RIR_TARGET),
  );
}

/** Base % comes from the exercise only; RIR scales it when progression gate passes. */
export function progressionOverloadPctToApply(input: {
  exercisePct: number | null;
  progressionPassed: boolean;
  rir: number | null | undefined;
}): number {
  if (!input.progressionPassed) return 0;
  const base =
    input.exercisePct != null && Number.isFinite(Number(input.exercisePct))
      ? Number(input.exercisePct)
      : 0;
  if (!base || base <= 0) return 0;
  return base * rirOverloadMultiplier(input.rir);
}

type SetPerformance = {
  reps: number | null;
  rir: number | null;
};

export type ProgressionDirection = "increase" | "decrease" | "none";

/**
 * Resolve progression direction based on exercise and set performance.
 *
 * **Increase**: ALL sets must satisfy `reps >= defaultReps AND rir > rirTarget (default 2)`,
 *   AND `latestSets.length >= defaultSets`.
 * **Decrease**: ANY set satisfies `reps < defaultReps AND rir <= 1`.
 * **None**: all other cases.
 *
 * `null` RIR is treated as 0 — it counts as ≤ 1 (can trigger decrease) and
 * fails the increase gate. Stretches should be excluded from this call.
 *
 * Evaluated at draft-workout creation and when adding sets from the last completed
 * session, not on workout finish.
 */
export function resolveProgressionDirection(input: {
  latestSets: SetPerformance[];
  defaultSets: number;
  defaultReps: number | null;
  rirTarget?: number;
}): ProgressionDirection {
  const rirTarget = input.rirTarget ?? SMART_PROGRESSION_RIR_TARGET;
  const defaultReps = input.defaultReps ?? 0;

  // Check for decrease condition: any set with reps < defaultReps AND rir <= 1
  for (const set of input.latestSets) {
    const setReps = set.reps == null ? 0 : Number(set.reps);
    const setRir = set.rir == null ? 0 : Number(set.rir);
    if (setReps < defaultReps && setRir <= 1) {
      return "decrease";
    }
  }

  // Check for increase condition: all sets meet criteria
  if (input.latestSets.length >= input.defaultSets) {
    const allPass = input.latestSets.every((set) => {
      const setReps = set.reps == null ? 0 : Number(set.reps);
      const setRir = set.rir == null ? 0 : Number(set.rir);
      return setReps >= defaultReps && setRir > rirTarget;
    });
    if (allPass) {
      return "increase";
    }
  }

  return "none";
}
