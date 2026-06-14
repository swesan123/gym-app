import { ExerciseSettingsClient } from "@/components/settings/ExerciseSettingsClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { createClient } from "@/lib/supabase/server";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";

export default async function ExercisesSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [{ data, error }, catalog] = await Promise.all([
    supabase
      .from("exercises")
      .select("*, exercise_splits(split_name)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    fetchSplitsCatalog(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <ExerciseSettingsClient
      exercises={data ?? []}
      splits={catalog.splits}
      splitsTableReady={catalog.splitsTableReady}
    />
  );
}
