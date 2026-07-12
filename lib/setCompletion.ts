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

  if (usesLoggedWeightColumn(set.tracking_type)) {
    const weight =
      set.tracking_type === "bodyweight" ? (set.weight ?? 0) : set.weight;
    if (weight == null) return false;
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

export type UndoneSetRow = {
  exercise_name: string;
  set_number: number;
  set_type?: string | null;
  completed_at: string | null;
};

/**
 * Builds a specific, human-readable message naming every exercise/set that
 * still needs a Done tap before the workout can be finished, instead of
 * letting an incomplete-sets error surface as a generic server error.
 */
export function formatUndoneSetsMessage(rows: UndoneSetRow[]): string | null {
  const undone = rows.filter(
    (r) => r.set_type !== "warmup" && r.completed_at == null,
  );
  if (undone.length === 0) return null;

  const labels = undone.map((r) => `${r.exercise_name} set ${r.set_number}`);
  if (labels.length === 1) {
    return `Mark Done on ${labels[0]} before finishing.`;
  }
  return `Mark Done on these sets before finishing: ${labels.join(", ")}.`;
}

export function getFinishModalState(rows: UndoneSetRow[]): {
  canFinish: boolean;
  title: string;
  description: string;
  confirmLabel: string;
} {
  const undoneMessage = formatUndoneSetsMessage(rows);
  if (!undoneMessage) {
    return {
      canFinish: true,
      title: "Finish workout?",
      description:
        "All sets are marked Done. This marks the session complete and returns home. You can review it in History.",
      confirmLabel: "Finish workout",
    };
  }
  return {
    canFinish: false,
    title: "Sets still need Done",
    description: undoneMessage,
    confirmLabel: "Mark all sets Done first",
  };
}
