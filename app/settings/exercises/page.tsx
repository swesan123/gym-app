import { ExerciseSettingsClient } from "@/components/settings/ExerciseSettingsClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export default async function ExercisesSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercises")
    .select("*, exercise_splits(split_name, sort_order)")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <ExerciseSettingsClient exercises={data ?? []} />;
}
