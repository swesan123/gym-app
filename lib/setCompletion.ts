import { usesLoggedWeightColumn } from "@/lib/progressiveOverload";

export type SetCompletionInput = {
  tracking_type: string;
  stretch_kind?: string | null;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  duration_seconds: number | null;
};

function isStretch(set: SetCompletionInput): boolean {
  return set.stretch_kind === "dynamic" || set.stretch_kind === "static";
}

/**
 * A set is "ready to complete" once all fields required for its tracking
 * type are filled in: reps (or duration for timed exercises), weight when
 * the exercise logs it, and RIR. Stretch exercises (dynamic/static) do not
 * show the RIR column so RIR is not required for them.
 */
export function isSetReadyToComplete(set: SetCompletionInput): boolean {
  const hasRepsOrDuration =
    set.tracking_type === "timed"
      ? set.duration_seconds != null
      : set.reps != null;
  if (!hasRepsOrDuration) return false;

  if (usesLoggedWeightColumn(set.tracking_type) && set.weight == null) {
    return false;
  }

  if (!isStretch(set) && set.rir == null) return false;

  return true;
}

export function incompleteSets<T extends SetCompletionInput & { set_type?: string }>(
  sets: T[],
): T[] {
  return sets.filter(
    (s) => s.set_type !== "warmup" && !isSetReadyToComplete(s),
  );
}
