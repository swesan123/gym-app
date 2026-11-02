import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";
import type { StretchKind, TrackingType } from "@/lib/database.types";
import { syncExerciseToActiveDraftCore } from "@/lib/core/workouts";
import { isWorkoutSplitsTableUnavailable } from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";

export type CreateExerciseCoreInput = {
  name: string;
  muscle: string;
  splits: string[];
  default_sets: number;
  tracking_type: TrackingType;
  notes: string | null;
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
  default_reps: number | null;
  progressive_overload_increment: number | null;
  rest_seconds: number | null;
  stretch_kind: StretchKind;
  duration_start_seconds: number | null;
  duration_end_seconds: number | null;
  duration_step_seconds: number | null;
};

/**
 * Creates an exercise and assigns it to splits. Does not revalidate paths —
 * callers (server actions / route handlers) own cache invalidation.
 * `syncedDraftIds` lists active drafts that received the new exercise's sets.
 */
export async function createExerciseCore(
  input: CreateExerciseCoreInput,
): Promise<{ id: string; syncedDraftIds: string[] }> {
  const supabase = await createClient();

  const splitNames = input.splits.map((s) => s.trim());
  const requestedSplits = [...new Set(splitNames)].filter(
    (s) => s !== UNASSIGNED_SPLIT_NAME,
  );

  if (requestedSplits.length > 0) {
    const { data: knownSplits, error: splitsErr } = await supabase
      .from("workout_splits")
      .select("name")
      .in("name", requestedSplits)
      .is("archived_at", null);

    if (splitsErr && !isWorkoutSplitsTableUnavailable(splitsErr)) {
      throw new Error(splitsErr.message);
    }

    if (!splitsErr) {
      const known = new Set((knownSplits ?? []).map((s) => s.name));
      const unknown = requestedSplits.filter((s) => !known.has(s));
      if (unknown.length > 0) {
        throw new Error(
          `Unknown split${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}. Add ${unknown.length === 1 ? "it" : "them"} under Settings → Splits.`,
        );
      }
    }
  }

  const { data: inserted, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name.trim(),
      muscle: input.muscle.trim(),
      default_sets: input.default_sets,
      tracking_type: input.tracking_type,
      notes: input.notes,
      machine_start_weight: input.machine_start_weight,
      machine_end_weight: input.machine_end_weight,
      machine_increment: input.machine_increment,
      default_reps: input.default_reps,
      progressive_overload_increment: input.progressive_overload_increment,
      rest_seconds: input.rest_seconds,
      stretch_kind: input.stretch_kind,
      duration_start_seconds: input.duration_start_seconds,
      duration_end_seconds: input.duration_end_seconds,
      duration_step_seconds: input.duration_step_seconds,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error(error?.message ?? "Failed to create exercise");

  // Insert splits into junction table
  const splitsToInsert = splitNames.map((splitName, idx) => ({
    exercise_id: inserted.id,
    split_name: splitName,
    sort_order: idx,
  }));

  if (splitsToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("exercise_splits")
      .insert(splitsToInsert);

    if (insertErr) {
      // Clean up if split insert fails
      await supabase.from("exercises").delete().eq("id", inserted.id);
      throw new Error(insertErr.message);
    }
  }

  const syncedDraftIds: string[] = [];
  for (const splitName of splitNames) {
    const draftId = await syncExerciseToActiveDraftCore(inserted.id, splitName);
    if (draftId) syncedDraftIds.push(draftId);
  }

  return { id: inserted.id, syncedDraftIds };
}
