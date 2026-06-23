import { SplitSettingsClient } from "@/components/settings/SplitSettingsClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { fetchSplitsCatalog, fetchArchivedSplits } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function SplitsSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const supabase = await createClient();

  const [{ splits, splitsTableReady }, archivedSplits, exercisesResult] = await Promise.all([
    fetchSplitsCatalog(),
    fetchArchivedSplits(),
    supabase
      .from("exercises")
      .select("id, name, stretch_kind, exercise_splits!inner(split_name, sort_order)")
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <SplitSettingsClient
      splits={splits}
      archivedSplits={archivedSplits}
      exercises={exercisesResult.data ?? []}
      splitsTableReady={splitsTableReady}
    />
  );
}
