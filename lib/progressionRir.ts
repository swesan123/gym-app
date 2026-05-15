/** Minimum RIR before smart progression applies (same as prior hard-coded gate). */
export const SMART_PROGRESSION_RIR_TARGET = 2;

/**
 * Scale overload % upward when the athlete finishes with more reps in reserve.
 * At RIR === target, multiplier is 1; each step above adds 15% (capped at 2×).
 */
export function rirOverloadMultiplier(rir: number | null | undefined): number {
  if (rir == null || !Number.isFinite(rir)) return 1;
  if (rir < SMART_PROGRESSION_RIR_TARGET) return 1;
  return Math.min(
    2,
    1 +
      0.15 *
        (Number(rir) - SMART_PROGRESSION_RIR_TARGET),
  );
}

export function progressionOverloadPctToApply(input: {
  profileBasePct: number | null;
  exercisePct: number | null;
  progressionPassed: boolean;
  rir: number | null | undefined;
}): number {
  if (!input.progressionPassed) return 0;
  const fromProfile =
    input.profileBasePct != null && Number.isFinite(Number(input.profileBasePct))
      ? Number(input.profileBasePct)
      : null;
  const fromExercise =
    input.exercisePct != null && Number.isFinite(Number(input.exercisePct))
      ? Number(input.exercisePct)
      : null;
  const base = fromProfile ?? fromExercise ?? 0;
  if (!base || base <= 0) return 0;
  return base * rirOverloadMultiplier(input.rir);
}
