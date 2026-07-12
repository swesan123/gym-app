import { useEffect, useMemo, useRef, useState } from "react";

import { buildFocusSteps } from "@/components/workout/focusSteps";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { groupFlatSets } from "@/components/workout/groupSets";
import type { FocusStep } from "@/components/workout/focusSteps";

const FOCUS_STEP_STORAGE_PREFIX = "gym-app:focusStep:";

function resolveFocusIndex(
  rows: FlatSetRow[],
  focusSteps: FocusStep[],
  focusStepStorageKey: string,
  readOnly: boolean,
): number {
  if (readOnly || focusSteps.length === 0) return 0;

  if (typeof window !== "undefined") {
    const saved = window.sessionStorage.getItem(focusStepStorageKey);
    if (saved) {
      const idx = focusSteps.findIndex((s) => s.setId === saved);
      if (idx >= 0) return idx;
    }
  }

  const firstIncomplete = focusSteps.findIndex((step) => {
    const row = rows.find((r) => r.id === step.setId);
    return row && row.set_type !== "warmup" && row.completed_at == null;
  });
  return firstIncomplete >= 0 ? firstIncomplete : 0;
}

export function useFocusNavigation(
  rows: FlatSetRow[],
  workoutId: string,
  readOnly: boolean,
) {
  const focusStepStorageKey = `${FOCUS_STEP_STORAGE_PREFIX}${workoutId}`;
  const groups = useMemo(() => groupFlatSets(rows), [rows]);
  const focusSteps = useMemo(() => buildFocusSteps(groups), [groups]);

  const [focusIndex, setFocusIndex] = useState(() =>
    resolveFocusIndex(rows, focusSteps, focusStepStorageKey, readOnly),
  );

  const focusStepsSignature = focusSteps.map((s) => s.setId).join("|");
  const prevStepsSignatureRef = useRef(focusStepsSignature);

  useEffect(() => {
    if (prevStepsSignatureRef.current === focusStepsSignature) return;
    prevStepsSignatureRef.current = focusStepsSignature;

    setFocusIndex((current) => {
      if (focusSteps.length === 0) return 0;
      if (current < focusSteps.length) return current;
      return resolveFocusIndex(
        rows,
        focusSteps,
        focusStepStorageKey,
        readOnly,
      );
    });
  }, [focusStepsSignature, focusSteps, rows, focusStepStorageKey, readOnly]);

  const clampedFocusIndex =
    focusSteps.length > 0 ? Math.min(focusIndex, focusSteps.length - 1) : 0;
  const focusStep = focusSteps[clampedFocusIndex] ?? null;

  useEffect(() => {
    if (readOnly || !focusStep) return;
    window.sessionStorage.setItem(focusStepStorageKey, focusStep.setId);
  }, [focusStep, readOnly, focusStepStorageKey]);

  const focusRow = focusStep
    ? (rows.find((r) => r.id === focusStep.setId) ?? null)
    : null;
  const focusGroup = focusStep
    ? (groups.find((g) => g.exercise_id === focusStep.exerciseId) ?? null)
    : null;

  return {
    groups,
    focusSteps,
    focusStep,
    focusRow,
    focusGroup,
    clampedFocusIndex,
    setFocusIndex,
  };
}
