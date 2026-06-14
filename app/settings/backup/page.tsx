import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import BackupSettingsClient from "@/components/settings/BackupSettingsClient";
import { hasSupabaseEnv } from "@/lib/env";

export default function BackupPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  return <BackupSettingsClient />;
}
