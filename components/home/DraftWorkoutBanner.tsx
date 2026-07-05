"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { discardDraft } from "@/app/actions/workouts";
import { Modal } from "@/components/ui/modal";

export function DraftWorkoutBanner({
  draftId,
  splitName,
}: {
  draftId: string;
  splitName: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirmDiscard = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      await discardDraft(draftId);
    });
  };

  return (
    <>
      <div className="mb-10 rounded-lg border border-[var(--gym-amber)]/30 bg-[var(--gym-amber)]/5 p-4 dark:border-[var(--gym-amber)]/40 dark:bg-[var(--gym-amber)]/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gym-amber)] dark:text-orange-400">
          Draft in progress
        </p>
        <p className="mt-2 font-data text-lg font-semibold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          {splitName}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/workout/${draftId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 py-2 font-semibold text-[var(--steel-gray)] transition hover:bg-[var(--gray-100)] dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-200)]"
          >
            Continue
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--muted-red)]/40 bg-transparent px-4 py-2 font-semibold text-[var(--muted-red)] transition hover:bg-[var(--muted-red)]/5 disabled:opacity-50 dark:hover:bg-[var(--muted-red)]/10"
          >
            Discard
          </button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Discard draft workout?"
        description="This permanently deletes the draft and any sets logged so far. This cannot be undone."
        variant="danger"
        confirmLabel="Discard draft"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDiscard}
      />
    </>
  );
}
