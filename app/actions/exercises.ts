"use server";

import { revalidatePath } from "next/cache";

import type { StretchKind, TrackingType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

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
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  // Delete existing splits and re-insert selected ones
  const { error: deleteErr } = await supabase
    .from("exercise_splits")
    .delete()
    .eq("exercise_id", input.id);

  if (deleteErr) throw new Error(deleteErr.message);

  const splitsToInsert = input.splits.map((splitName, idx) => ({
    exercise_id: input.id,
    split_name: splitName.trim(),
    sort_order: idx,
  }));

  if (splitsToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("exercise_splits")
      .insert(splitsToInsert);

    if (insertErr) throw new Error(insertErr.message);
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

  const { data: ex, error: exErr } = await supabase
    .from("exercises")
    .select("id, stretch_kind")
    .eq("id", exerciseId)
    .single();

  if (exErr || !ex) throw new Error(exErr?.message ?? "Exercise not found");

  const { data: list, error: listErr } = await supabase
    .from("exercise_splits")
    .select("exercise_id, sort_order, exercises!inner(id, name, stretch_kind)")
    .eq("split_name", splitName)
    .eq("exercises.stretch_kind", ex.stretch_kind ?? "none")
    .order("sort_order", { ascending: true })
    .order("exercise_id", { ascending: true });

  if (listErr || !list?.length) {
    throw new Error(listErr?.message ?? "Could not load exercises");
  }

  const idx = list.findIndex((r) => r.exercise_id === exerciseId);
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || j < 0 || j >= list.length) return;

  const a = list[idx];
  const b = list[j];
  const orderA = Number(a.sort_order);
  const orderB = Number(b.sort_order);

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
