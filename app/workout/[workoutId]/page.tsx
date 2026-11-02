import { notFound } from "next/navigation";

import { ActiveWorkout } from "@/components/workout/ActiveWorkout";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { hasSupabaseEnv } from "@/lib/env";
import type { LoadAdjustments } from "@/lib/loadAdjustment";
import {
  fetchBodyWeight,
  fetchExerciseWeightPresetsMap,
  fetchGlobalWeightPresets,
  fetchSetsForWorkout,
} from "@/lib/queries/read";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ workoutId: string }> };

const isPlainObject = (value: unknown): value is LoadAdjustments =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !workout) {
    notFound();
  }

  const [rows, weightPresets, bodyWeight] = await Promise.all([
    fetchSetsForWorkout(workoutId, workout.split),
    fetchGlobalWeightPresets(),
    fetchBodyWeight(),
  ]);
  const exercisePresetMap = await fetchExerciseWeightPresetsMap(
    rows.map((r) => r.exercise_id),
  );

  const loadAdjustments =
    workout.status === "draft" && isPlainObject(workout.load_adjustments)
      ? workout.load_adjustments
      : null;

  return (
    <ActiveWorkout
      workoutId={workoutId}
      split={workout.split}
      status={workout.status}
      workoutCreatedAt={workout.created_at}
      rows={rows}
      weightPresets={weightPresets}
      exercisePresetMap={exercisePresetMap}
      bodyWeight={bodyWeight}
      loadAdjustments={loadAdjustments}
    />
  );
}
