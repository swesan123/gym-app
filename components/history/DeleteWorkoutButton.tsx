"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteWorkout } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      try {
        await deleteWorkout(workoutId);
        router.push("/history");
        router.refresh();
      } catch {
        /* surfaced via UI elsewhere if needed */
      }
    });
  };

  return (
    <>
      <Button
        variant="danger"
        type="button"
        disabled={pending}
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Delete workout
      </Button>
      <Modal
        open={open}
        title="Delete workout?"
        description="This permanently deletes the workout and all logged sets."
        variant="danger"
        confirmLabel="Delete workout"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}
