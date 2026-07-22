"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { permanentlyDeleteWorkout, restoreWorkout } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function RestoreWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onRestore = () => {
    startTransition(async () => {
      await restoreWorkout(workoutId);
      router.refresh();
    });
  };

  const onPermanentlyDelete = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      await permanentlyDeleteWorkout(workoutId);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          type="button"
          disabled={pending}
          className="min-h-9 px-3 text-xs"
          onClick={onRestore}
        >
          Restore
        </Button>
        <Button
          variant="danger"
          type="button"
          disabled={pending}
          className="min-h-9 px-3 text-xs"
          onClick={() => setConfirmOpen(true)}
        >
          Delete forever
        </Button>
      </div>
      <Modal
        open={confirmOpen}
        title="Delete this workout forever?"
        description="This permanently erases the workout and all logged sets. It cannot be restored after this."
        variant="danger"
        confirmLabel="Delete forever"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onPermanentlyDelete}
      />
    </>
  );
}
