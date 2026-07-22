"use server";

import { revalidatePath } from "next/cache";

import type { StretchKind, TrackingType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { syncExerciseToActiveDraft } from "@/app/actions/workouts";

export async function updateExercise(input: {
  id: string;
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
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update({
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
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  // Fetch existing sort_orders before deleting so we can preserve them
  const { data: existingSplitRows } = await supabase
    .from("exercise_splits")
    .select("split_name, sort_order")
    .eq("exercise_id", input.id);

  const existingSortOrders = new Map(
    (existingSplitRows ?? []).map((es) => [es.split_name, es.sort_order]),
  );

  // For newly added splits, find the current max sort_order in each split
  const newSplitNames = input.splits
    .map((s) => s.trim())
    .filter((s) => !existingSortOrders.has(s));

  const newSplitMaxOrders = new Map<string, number>();
  for (const splitName of newSplitNames) {
    const { data: maxRows } = await supabase
      .from("exercise_splits")
      .select("sort_order")
      .eq("split_name", splitName)
      .order("sort_order", { ascending: false })
      .limit(1);
    newSplitMaxOrders.set(splitName, (maxRows?.[0]?.sort_order ?? -1) + 1);
  }

  const { error: deleteErr } = await supabase
    .from("exercise_splits")
    .delete()
    .eq("exercise_id", input.id);

  if (deleteErr) throw new Error(deleteErr.message);

  const splitsToInsert = input.splits.map((splitName) => {
    const trimmed = splitName.trim();
    return {
      exercise_id: input.id,
      split_name: trimmed,
      sort_order: existingSortOrders.get(trimmed) ?? newSplitMaxOrders.get(trimmed) ?? 0,
    };
  });

  if (splitsToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("exercise_splits")
      .insert(splitsToInsert);

    if (insertErr) throw new Error(insertErr.message);
  }

  for (const splitName of newSplitNames) {
    await syncExerciseToActiveDraft(input.id, splitName);
  }

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function createExercise(input: {
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
}) {
  const supabase = await createClient();

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
  const splitsToInsert = input.splits.map((splitName, idx) => ({
    exercise_id: inserted.id,
    split_name: splitName.trim(),
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

  for (const splitName of input.splits) {
    await syncExerciseToActiveDraft(inserted.id, splitName.trim());
  }

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function reorderExercise(
  exerciseId: string,
  splitName: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();

  // Fetch all exercise_splits for this split with exercise stretch_kind
  const { data: allRows, error: listErr } = await supabase
    .from("exercise_splits")
    .select("exercise_id, sort_order, exercises(stretch_kind)")
    .eq("split_name", splitName)
    .order("sort_order", { ascending: true })
    .order("exercise_id", { ascending: true });

  if (listErr || !allRows?.length) {
    throw new Error(listErr?.message ?? "Could not load exercises");
  }

  // Find the target exercise's stretch_kind
  const target = allRows.find((r) => r.exercise_id === exerciseId);
  if (!target) throw new Error("Exercise not found in split");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetKind = ((target.exercises as any)?.[0]?.stretch_kind ?? (target.exercises as any)?.stretch_kind) ?? "none";

  // Filter to only same stretch_kind section (same group as the target)
  const sameSection = allRows.filter((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kind = ((r.exercises as any)?.[0]?.stretch_kind ?? (r.exercises as any)?.stretch_kind) ?? "none";
    return kind === targetKind;
  });

  const idx = sameSection.findIndex((r) => r.exercise_id === exerciseId);
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || j < 0 || j >= sameSection.length) return;

  // Normalize sort_orders for ALL exercises across all sections first,
  // assigning sequential values (100, 101, 102...) per section to avoid collisions.
  // This fixes the case where all exercises have sort_order=0.
  const sections = ["dynamic", "none", "static"];
  for (const sectionKind of sections) {
    const sectionRows = allRows.filter((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kind = ((r.exercises as any)?.[0]?.stretch_kind ?? (r.exercises as any)?.stretch_kind) ?? "none";
      return kind === sectionKind;
    });
    for (let i = 0; i < sectionRows.length; i++) {
      const newOrder = sections.indexOf(sectionKind) * 1000 + i;
      if (Number(sectionRows[i].sort_order) !== newOrder) {
        await supabase
          .from("exercise_splits")
          .update({ sort_order: newOrder })
          .eq("exercise_id", sectionRows[i].exercise_id)
          .eq("split_name", splitName);
      }
    }
  }

  // Now do the actual swap using the normalized values
  const sectionBase = sections.indexOf(targetKind) * 1000;
  const orderA = sectionBase + idx;
  const orderB = sectionBase + j;

  const a = sameSection[idx];
  const b = sameSection[j];

  const { error: u1 } = await supabase
    .from("exercise_splits")
    .update({ sort_order: orderB })
    .eq("exercise_id", a.exercise_id)
    .eq("split_name", splitName);
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await supabase
    .from("exercise_splits")
    .update({ sort_order: orderA })
    .eq("exercise_id", b.exercise_id)
    .eq("split_name", splitName);
  if (u2) throw new Error(u2.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
}

export async function archiveExercise(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("exercises")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function restoreExercise(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("exercises")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();

  const { error: setsErr } = await supabase
    .from("workout_sets")
    .delete()
    .eq("exercise_id", id);
  if (setsErr) throw new Error(setsErr.message);

  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
  revalidatePath("/history");
}

/**
 * Batch-update sort_order for a list of exercises within a split section.
 * Exercises are assigned sort_order 0, 1, 2, … in the given order.
 * Sections (dynamic / main / static) are isolated by stretch_kind at query
 * time, so overlapping sort_orders between sections are fine.
 */
export async function setExerciseOrder(
  splitName: string,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) return;
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("exercise_splits")
        .update({ sort_order: index })
        .eq("exercise_id", id)
        .eq("split_name", splitName),
    ),
  );

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
}
