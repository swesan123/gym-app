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
