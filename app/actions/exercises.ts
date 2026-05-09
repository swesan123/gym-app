"use server";

import { revalidatePath } from "next/cache";

import type { StretchKind, TrackingType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export async function updateExercise(input: {
  id: string;
  name: string;
  muscle: string;
  split: string;
  default_sets: number;
  tracking_type: TrackingType;
  notes: string | null;
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
  default_reps: number | null;
  progressive_overload_pct: number | null;
  stretch_kind: StretchKind;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update({
      name: input.name.trim(),
      muscle: input.muscle.trim(),
      split: input.split.trim(),
      default_sets: input.default_sets,
      tracking_type: input.tracking_type,
      notes: input.notes,
      machine_start_weight: input.machine_start_weight,
      machine_end_weight: input.machine_end_weight,
      machine_increment: input.machine_increment,
      default_reps: input.default_reps,
      progressive_overload_pct: input.progressive_overload_pct,
      stretch_kind: input.stretch_kind,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function createExercise(input: {
  name: string;
  muscle: string;
  split: string;
  default_sets: number;
  tracking_type: TrackingType;
  notes: string | null;
  machine_start_weight: number | null;
  machine_end_weight: number | null;
  machine_increment: number | null;
  default_reps: number | null;
  progressive_overload_pct: number | null;
  stretch_kind: StretchKind;
}) {
  const supabase = await createClient();
  const split = input.split.trim();

  const { data: maxRow } = await supabase
    .from("exercises")
    .select("sort_order")
    .eq("split", split)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort =
    maxRow?.sort_order == null ? 0 : Number(maxRow.sort_order) + 1;

  const { error } = await supabase.from("exercises").insert({
    name: input.name.trim(),
    muscle: input.muscle.trim(),
    split,
    default_sets: input.default_sets,
    tracking_type: input.tracking_type,
    notes: input.notes,
    machine_start_weight: input.machine_start_weight,
    machine_end_weight: input.machine_end_weight,
    machine_increment: input.machine_increment,
    default_reps: input.default_reps,
    progressive_overload_pct: input.progressive_overload_pct,
    stretch_kind: input.stretch_kind,
    sort_order: nextSort,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
  revalidatePath("/progress");
}

export async function reorderExercise(
  exerciseId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();

  const { data: ex, error: exErr } = await supabase
    .from("exercises")
    .select("id, split")
    .eq("id", exerciseId)
    .single();

  if (exErr || !ex) throw new Error(exErr?.message ?? "Exercise not found");

  const { data: list, error: listErr } = await supabase
    .from("exercises")
    .select("id, sort_order")
    .eq("split", ex.split)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (listErr || !list?.length) {
    throw new Error(listErr?.message ?? "Could not load exercises");
  }

  const idx = list.findIndex((r) => r.id === exerciseId);
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || j < 0 || j >= list.length) return;

  const a = list[idx];
  const b = list[j];
  const orderA = Number(a.sort_order);
  const orderB = Number(b.sort_order);

  const { error: u1 } = await supabase
    .from("exercises")
    .update({ sort_order: orderB })
    .eq("id", a.id);
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await supabase
    .from("exercises")
    .update({ sort_order: orderA })
    .eq("id", b.id);
  if (u2) throw new Error(u2.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();

  const { count, error: cErr } = await supabase
    .from("workout_sets")
    .select("*", { count: "exact", head: true })
    .eq("exercise_id", id);

  if (cErr) throw new Error(cErr.message);
  if (count && count > 0) {
    throw new Error(
      "This exercise has logged sets in workouts. Remove or archive is not supported yet.",
    );
  }

  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
}
