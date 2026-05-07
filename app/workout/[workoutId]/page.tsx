import { notFound } from "next/navigation";

import { ActiveWorkout } from "@/components/workout/ActiveWorkout";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { hasSupabaseEnv } from "@/lib/env";
import {
  fetchGlobalWeightPresets,
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

  const [rows, weightPresets] = await Promise.all([
    fetchSetsForWorkout(workoutId),
    fetchGlobalWeightPresets(),
  ]);

  return (
    <ActiveWorkout
      workoutId={workoutId}
      split={workout.split}
      status={workout.status}
      rows={rows}
      weightPresets={weightPresets}
    />
  );
}
