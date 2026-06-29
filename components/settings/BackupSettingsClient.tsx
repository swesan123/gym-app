"use client";

import { useState, useTransition } from "react";
import { exportAllData } from "@/app/actions/backup";
import { Button } from "@/components/ui/button";

const REQUIRED_SECRETS = [
  {
    name: "SUPABASE_MIGRATION_DB_URL",
    description: "Direct Postgres connection string from Supabase → Settings → Database → Connection string (URI mode).",
  },
  {
    name: "GCP_WORKLOAD_IDENTITY_PROVIDER",
    description:
      "Full Workload Identity Provider resource name, e.g. projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github.",
  },
  {
    name: "GCP_SERVICE_ACCOUNT",
    description:
      "Service account email (no JSON key). The Drive backup folder must be shared with this account as Editor.",
  },
  {
    name: "GOOGLE_DRIVE_FOLDER_ID",
    description: "ID of the Google Drive folder to upload backups into. Found in the folder URL: drive.google.com/drive/folders/<ID>.",
  },
] as const;

export default function BackupSettingsClient() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownload = () => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const jsonString = await exportAllData();
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `gym-app-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    });
  };

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Backup
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Two backup options: instant JSON download for quick exports, and automated nightly
          database backups to Google Drive via GitHub Actions.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
          Backup downloaded successfully!
        </p>
      ) : null}

      {/* Manual JSON backup */}
      <section className="rounded-xl border border-[var(--gray-200)] bg-[var(--chalk-white)] p-5 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]">
        <h2 className="text-base font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          Manual JSON export
        </h2>
        <p className="mt-1 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Downloads all exercises, workouts, and sets as a JSON file. Useful for a quick snapshot.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            onClick={handleDownload}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Exporting…" : "Download JSON backup"}
          </Button>
        </div>
      </section>

      {/* Automated Google Drive backup */}
      <section className="mt-6 rounded-xl border border-[var(--gray-200)] bg-[var(--chalk-white)] p-5 dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
              Automated backups — Google Drive
            </h2>
            <p className="mt-1 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
              A GitHub Actions workflow runs daily at 06:00 UTC. It performs a{" "}
              <code className="rounded bg-[var(--gray-100)] px-1 text-xs dark:bg-[var(--gray-200)]">pg_dump</code>{" "}
              of your Supabase database and uploads the compressed backup to Google Drive via rclone.
              Backups are also retained as workflow artifacts for 14 days.
            </p>
          </div>
          <a
            href="https://github.com/swesan123/gym-app/actions/workflows/backup-database.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-1.5 text-xs font-medium text-[var(--steel-gray)] hover:bg-[var(--gray-100)] dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-200)]"
          >
            View runs →
          </a>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Required GitHub Actions secrets
          </h3>
          <p className="mt-1 text-xs text-[var(--gray-500)] dark:text-[var(--gray-400)]">
            Add these under{" "}
            <a
              href="https://github.com/swesan123/gym-app/settings/secrets/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gym-amber)] underline"
            >
              Settings → Secrets and variables → Actions
            </a>
            .
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {REQUIRED_SECRETS.map((s) => (
              <li
                key={s.name}
                className="rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-3 dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)]/50"
              >
                <code className="text-xs font-bold text-[var(--gym-amber)]">{s.name}</code>
                <p className="mt-1 text-xs text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                  {s.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)]/50">
          <h3 className="text-sm font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            Setup checklist
          </h3>
          <ol className="mt-2 space-y-1.5 text-sm text-[var(--gray-600)] dark:text-[var(--gray-400)]">
            <li>1. Create a Google Cloud project and enable the Google Drive API.</li>
            <li>2. Create a service account (no JSON key) and share the backup Drive folder with it.</li>
            <li>
              3. Set up Workload Identity Federation: OIDC provider for GitHub Actions, scoped to this
              repository.
            </li>
            <li>
              4. Grant the GitHub principal <strong>Workload Identity User</strong> on the service account.
            </li>
            <li>5. Add all four secrets listed above to the repository.</li>
            <li>
              6. Trigger a manual run via{" "}
              <a
                href="https://github.com/swesan123/gym-app/actions/workflows/backup-database.yml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--gym-amber)] underline"
              >
                Actions → Backup Database → Run workflow
              </a>{" "}
              to verify.
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
