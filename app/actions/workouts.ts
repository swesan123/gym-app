"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { TrackingType } from "@/lib/database.types";
import { isWorkoutSplitsTableUnavailable } from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";
import { formatWorkoutWeek } from "@/lib/week";
import { computeSetVolume } from "@/lib/volume";

export async function createWorkoutDraftAndRedirect(split: string) {
  const splitName = split.trim();
  if (!splitName) throw new Error("Choose a split");

  const supabase = await createClient();

  const { data: known, error: splitErr } = await supabase
    .from("workout_splits")
    .select("id")
    .eq("name", splitName)
    .maybeSingle();

  if (splitErr && !isWorkoutSplitsTableUnavailable(splitErr)) {
    throw new Error(splitErr.message);
  }

  const splitsTableMissing =
    !!splitErr && isWorkoutSplitsTableUnavailable(splitErr);

  if (!splitsTableMissing && !known) {
    throw new Error("Unknown split. Add it under Settings → Splits.");
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const week = formatWorkoutWeek(today);

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({ date: dateStr, week, split: splitName, status: "draft" })
    .select("id")
    .single();

  if (wErr || !workout) {
    throw new Error(wErr?.message ?? "Failed to create workout");
  }

  const { data: exercises, error: eErr } = await supabase
    .from("exercises")
    .select("id, default_sets")
    .eq("split", splitName);

  if (eErr || !exercises?.length) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(eErr?.message ?? "No exercises for this split");
  }

  const rows = exercises.flatMap((ex) =>
    Array.from({ length: ex.default_sets }, (_, i) => ({
      workout_id: workout.id,
      exercise_id: ex.id,
      set_number: i + 1,
    })),
  );

  const { error: sErr } = await supabase.from("workout_sets").insert(rows);
  if (sErr) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    throw new Error(sErr.message);
  }

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/workout/${workout.id}`);
}

export async function updateWorkoutSet(input: {
  id: string;
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
  duration_seconds?: number | null;
  note?: string | null;
}) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_training_profile")
    .select("body_weight")
    .eq("singleton", true)
    .maybeSingle();
  const bodyWeight =
    profile?.body_weight == null ? null : Number(profile.body_weight);

  const { data: row, error: fetchErr } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight, rir, duration_seconds, note")
    .eq("id", input.id)
    .single();

  if (fetchErr || !row) {
    throw new Error(fetchErr?.message ?? "Set not found");
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("tracking_type")
    .eq("id", row.exercise_id)
    .single();

  const trackingType = (exercise?.tracking_type ?? "weighted") as TrackingType;

  const reps = input.reps !== undefined ? input.reps : row.reps;
  const weight = input.weight !== undefined ? input.weight : row.weight;
  const durationSeconds =
    input.duration_seconds !== undefined
      ? input.duration_seconds
      : row.duration_seconds;

  const volume = computeSetVolume(trackingType, {
    reps,
    weight,
    durationSeconds,
    bodyWeight,
  });

  const { error } = await supabase
    .from("workout_sets")
    .update({
      reps,
      weight,
      rir: input.rir !== undefined ? input.rir : row.rir,
      duration_seconds: durationSeconds,
      note: input.note !== undefined ? input.note : row.note,
      volume,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}

export async function addWorkoutSet(workoutId: string, exerciseId: string) {
  const supabase = await createClient();

  const { data: existing, error: qErr } = await supabase
    .from("workout_sets")
    .select("set_number")
    .eq("workout_id", workoutId)
    .eq("exercise_id", exerciseId)
    .order("set_number", { ascending: false })
    .limit(1);

  if (qErr) throw new Error(qErr.message);

  const next =
    existing && existing.length > 0 ? existing[0].set_number + 1 : 1;

  const { data: exercise } = await supabase
    .from("exercises")
    .select("tracking_type")
    .eq("id", exerciseId)
    .single();

  const trackingType = (exercise?.tracking_type ?? "weighted") as TrackingType;

  const { error } = await supabase.from("workout_sets").insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    set_number: next,
    volume: computeSetVolume(trackingType, {}),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

export async function removeWorkoutSet(setId: string, workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);

  revalidatePath(`/workout/${workoutId}`);
  revalidatePath("/");
}

export async function finishWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ status: "completed" })
    .eq("id", workoutId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
  redirect("/");
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
}
