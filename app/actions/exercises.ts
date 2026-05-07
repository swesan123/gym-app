"use server";

import { revalidatePath } from "next/cache";

import type { TrackingType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export async function updateExercise(input: {
  id: string;
  name: string;
  muscle: string;
  split: string;
  default_sets: number;
  tracking_type: TrackingType;
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
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/exercises");
  revalidatePath("/workout/start");
}

export async function createExercise(input: {
  name: string;
  muscle: string;
  split: string;
  default_sets: number;
  tracking_type: TrackingType;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").insert({
    name: input.name.trim(),
    muscle: input.muscle.trim(),
    split: input.split.trim(),
    default_sets: input.default_sets,
    tracking_type: input.tracking_type,
  });

  if (error) throw new Error(error.message);
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
