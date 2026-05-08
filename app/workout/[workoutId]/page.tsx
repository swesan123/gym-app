import { notFound } from "next/navigation";

import { ActiveWorkout } from "@/components/workout/ActiveWorkout";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { hasSupabaseEnv } from "@/lib/env";
import {
  fetchBodyWeight,
  fetchExerciseWeightPresetsMap,
  fetchGlobalWeightPresets,
  fetchPreviousWeightsForWorkout,
  fetchSetsForWorkout,
} from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ workoutId: string }> };

export default async function WorkoutSessionPage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { workoutId } = await params;
  const supabase = await createClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .maybeSingle();

  if (error || !workout) {
    notFound();
  }

  const [rows, weightPresets, previousWeights, bodyWeight] = await Promise.all([
    fetchSetsForWorkout(workoutId),
    fetchGlobalWeightPresets(),
    fetchPreviousWeightsForWorkout(workoutId),
    fetchBodyWeight(),
  ]);
  const exercisePresetMap = await fetchExerciseWeightPresetsMap(
    rows.map((r) => r.exercise_id),
  );

  return (
    <ActiveWorkout
      workoutId={workoutId}
      split={workout.split}
      status={workout.status}
      rows={rows}
      weightPresets={weightPresets}
      exercisePresetMap={exercisePresetMap}
      previousWeights={previousWeights}
      bodyWeight={bodyWeight}
    />
  );
}
