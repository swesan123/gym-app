"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateWorkoutSet } from "@/app/actions/workouts";
import { SetTableRow } from "@/components/workout/SetTableRow";
import type { FlatSetRow } from "@/components/workout/groupSets";
import {
  weightColumnTitle,
  weightHeader,
} from "@/components/workout/setFieldPresets";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { StretchKind, TrackingType } from "@/lib/database.types";

type Props = {
  exerciseName: string;
  exerciseNotes?: string | null;
  trackingType: TrackingType;
  stretchKind: StretchKind;
  sets: { id: string; set_number: number }[];
  rows: FlatSetRow[];
  weightPresets: number[];
  durationPresets: number[];
  bodyWeight: number | null;
  readOnly?: boolean;
  pending: boolean;
  restSeconds: number | null;
  onAddSet: () => void;
  onRequestRemove: (setId: string) => void;
  onUpdateNote: (setId: string, note: string | null) => void;
  onError: (message: string) => void;
  onDoneRest: (
    setId: string,
    restSeconds: number | null,
    exerciseName: string,
    isLastSetOfExercise: boolean,
  ) => void;
  onSetCompleted: (setId: string, completedAt: string | null) => void;
  onSetStarted: (setId: string, startedAt: string | null) => void;
  onSetFieldsChange: (
    setId: string,
    fields: {
      reps: number | null;
      weight: number | null;
      rir: number | null;
      duration_seconds: number | null;
    },
  ) => void;
};

export function ExerciseSetTable({
  exerciseName,
  exerciseNotes,
  trackingType,
  stretchKind,
  sets,
  rows,
  weightPresets,
  durationPresets,
  bodyWeight,
  readOnly,
  pending,
  restSeconds,
  onAddSet,
  onRequestRemove,
  onUpdateNote,
  onError,
  onDoneRest,
  onSetCompleted,
  onSetStarted,
  onSetFieldsChange,
}: Props) {
  const router = useRouter();
  const tt = trackingType;
  const showWeightCol =
    tt === "weighted" || tt === "assisted" || tt === "bodyweight";

  const [noteTarget, setNoteTarget] = useState<{
    setId: string;
    draft: string;
  } | null>(null);

  const onNoteConfirm = () => {
    if (!noteTarget) return;
    const t = noteTarget;
    const note = t.draft.trim() ? t.draft.trim() : null;

    onUpdateNote(t.setId, note);
    setNoteTarget(null);

    void (async () => {
      try {
        await updateWorkoutSet({ id: t.setId, note });
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to save note");
      }
    })();
  };

  const onNoteCancel = () => setNoteTarget(null);

  return (
    <>
      <section className="rounded-lg border border-[var(--gray-200)] bg-[var(--chalk-white)] dark:border-[var(--gray-100)] dark:bg-[var(--gray-50)]">
        <div className="border-b border-[var(--gray-100)] px-2 py-2 dark:border-[var(--gray-100)]">
          <h2 className="text-base font-bold leading-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            {exerciseName}
          </h2>
          {exerciseNotes ? (
            <p className="mt-1 text-xs text-[var(--gray-600)] dark:text-[var(--gray-400)]">
              {exerciseNotes}
            </p>
          ) : null}
        </div>
        <div className="w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:border-[var(--gray-100)] dark:bg-[var(--gray-100)]/50 dark:text-[var(--gray-400)]">
                <th className="sticky left-0 z-10 w-8 bg-[var(--gray-50)] py-2 pl-1 pr-1 text-center dark:bg-[var(--gray-100)]/50">
                  #
                </th>
                <th className="min-w-[3rem] py-2 pr-1">
                  {tt === "timed" ? "Sec" : "Reps"}
                </th>
                {showWeightCol ? (
                  <th
                    className="min-w-[3.5rem] py-2 pr-1"
                    title={weightColumnTitle(tt)}
                  >
                    {weightHeader(tt)}
                  </th>
                ) : null}
                {stretchKind === "none" && (
                  <th className="min-w-[4.5rem] py-2 pr-1">RIR</th>
                )}
                {readOnly && (
                  <th className="min-w-[4.75rem] py-2 pl-2 pr-1 text-right">
                    Vol
                  </th>
                )}
                <th className="min-w-[5rem] py-2 pl-2 pr-1">Note</th>
                {!readOnly ? <th className="w-[5.5rem] py-2 pr-1" /> : null}
              </tr>
            </thead>
            <tbody>
              {sets.map((s, idx) => {
                const flat = rows.find((r) => r.id === s.id);
                if (!flat) return null;
                const isLastSetOfExercise = idx === sets.length - 1;
                return (
                  <SetTableRow
                    key={s.id}
                    row={flat}
                    weightPresets={weightPresets}
                    durationPresets={durationPresets}
                    showWeightCol={showWeightCol}
                    bodyWeight={bodyWeight}
                    readOnly={readOnly}
                    onRequestRemove={onRequestRemove}
                    onOpenNote={(setId, initial) =>
                      setNoteTarget({ setId, draft: initial })
                    }
                    onDoneRest={() =>
                      onDoneRest(
                        s.id,
                        restSeconds,
                        exerciseName,
                        isLastSetOfExercise,
                      )
                    }
                    onSetCompleted={onSetCompleted}
                    onSetStarted={onSetStarted}
                    onSetFieldsChange={onSetFieldsChange}
                    onSetTypeChange={(setId, setType) => {
                      void (async () => {
                        try {
                          await updateWorkoutSet({ id: setId, set_type: setType });
                          router.refresh();
                        } catch {
                          // Error handling done at parent level
                        }
                      })();
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        {!readOnly ? (
          <div className="flex flex-col gap-2 border-t border-[var(--gray-100)] px-2 py-2 dark:border-[var(--gray-100)] sm:flex-row">
            <Button
              variant="secondary"
              type="button"
              className="min-h-10 w-full flex-1 py-2 text-sm"
              disabled={pending}
              onClick={onAddSet}
            >
              + Set
            </Button>
          </div>
        ) : null}
      </section>

      {!readOnly ? (
        <Modal
          open={!!noteTarget}
          title="Set note"
          description="Edit your note here. Use Done or Cancel to close."
          confirmLabel="Done"
          cancelLabel="Cancel"
          closeOnBackdrop={false}
          closeOnEscape={false}
          onCancel={onNoteCancel}
          onConfirm={onNoteConfirm}
        >
          <textarea
            value={noteTarget?.draft ?? ""}
            onChange={(e) =>
              setNoteTarget((n) => (n ? { ...n, draft: e.target.value } : n))
            }
            rows={6}
            autoFocus
            autoComplete="off"
            className="min-h-[8rem] w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] p-3 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
            aria-label="Note text"
          />
        </Modal>
      ) : null}
    </>
  );
}
