"use client";

import { useState, useTransition } from "react";
import { exportAllData } from "@/app/actions/backup";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div>
        <h1 className="text-2xl font-bold">Backup</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Download a backup of all your data as a JSON file. You can save this
          to Google Drive or another cloud storage service.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          Backup downloaded successfully!
        </p>
      ) : null}

      <div className="mt-6">
        <Button
          type="button"
          onClick={handleDownload}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Downloading..." : "Download Backup"}
        </Button>
      </div>
    </div>
  );
}
