import { SplitSettingsClient } from "@/components/settings/SplitSettingsClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function SplitsSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { splits, splitsTableReady } = await fetchSplitsCatalog();
  const supabase = await createClient();

  // Fetch all exercises with their split assignments
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, stretch_kind, exercise_splits!inner(split_name, sort_order)")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <SplitSettingsClient
      splits={splits}
      exercises={exercises ?? []}
      splitsTableReady={splitsTableReady}
    />
  );
}
