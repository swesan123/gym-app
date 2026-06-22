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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)] tracking-tight">
          Backup
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Download a backup of all your data as JSON. Save to cloud storage for safekeeping.
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

      <div className="mt-8">
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
