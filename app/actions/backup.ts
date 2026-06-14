"use server";

import { createClient } from "@/lib/supabase/server";

export async function exportAllData() {
  const supabase = await createClient();

  const [
    { data: exercises, error: exercisesError },
    { data: workoutSplits, error: splitsError },
    { data: workouts, error: workoutsError },
    { data: workoutSets, error: setsError },
    { data: weightOptions, error: weightError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase.from("exercises").select("*"),
    supabase.from("workout_splits").select("*"),
    supabase.from("workouts").select("*"),
    supabase.from("workout_sets").select("*"),
    supabase.from("weight_options").select("*"),
    supabase.from("user_training_profile").select("*"),
  ]);

  if (
    exercisesError ||
    splitsError ||
    workoutsError ||
    setsError ||
    weightError ||
    profileError
  ) {
    throw new Error("Failed to fetch data for backup");
  }

  const backupData = {
    exported_at: new Date().toISOString(),
    exercises: exercises ?? [],
    workout_splits: workoutSplits ?? [],
    workouts: workouts ?? [],
    workout_sets: workoutSets ?? [],
    weight_options: weightOptions ?? [],
    user_training_profile: profile ?? [],
  };

  return JSON.stringify(backupData, null, 2);
}
