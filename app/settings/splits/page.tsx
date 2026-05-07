import { SplitSettingsClient } from "@/components/settings/SplitSettingsClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { fetchSplitsCatalog } from "@/lib/queries/read";
import { hasSupabaseEnv } from "@/lib/env";

export default async function SplitsSettingsPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { splits, splitsTableReady } = await fetchSplitsCatalog();

  return (
    <SplitSettingsClient splits={splits} splitsTableReady={splitsTableReady} />
  );
}
