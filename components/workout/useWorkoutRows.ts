import { useCallback, useEffect, useRef, useState } from "react";

import type { FlatSetRow } from "@/components/workout/groupSets";
import { mergeServerRows } from "@/lib/mergeServerRows";

type SetFields = {
  reps: number | null;
  weight: number | null;
  rir: number | null;
  duration_seconds: number | null;
};

export function useWorkoutRows(serverRows: FlatSetRow[]) {
  const [localRows, setLocalRows] = useState(() => serverRows);
  const serverSignatureRef = useRef(rowSetSignature(serverRows));

  useEffect(() => {
    const signature = rowSetSignature(serverRows);
    if (signature === serverSignatureRef.current) return;
    serverSignatureRef.current = signature;
    setLocalRows((prev) => mergeServerRows(prev, serverRows));
  }, [serverRows]);

  const applyServerRows = useCallback((fresh: FlatSetRow[]) => {
    serverSignatureRef.current = rowSetSignature(fresh);
    setLocalRows((prev) => mergeServerRows(prev, fresh));
  }, []);

  const updateRowNote = useCallback((setId: string, note: string | null) => {
    setLocalRows((prev) =>
      prev.map((row) => (row.id === setId ? { ...row, note } : row)),
    );
  }, []);

  const updateRowCompletion = useCallback(
    (setId: string, completedAt: string | null) => {
      setLocalRows((prev) =>
        prev.map((row) =>
          row.id === setId ? { ...row, completed_at: completedAt } : row,
        ),
      );
    },
    [],
  );

  const updateRowStartedAt = useCallback((setId: string, startedAt: string | null) => {
    setLocalRows((prev) =>
      prev.map((row) =>
        row.id === setId ? { ...row, started_at: startedAt } : row,
      ),
    );
  }, []);

  const updateRowFields = useCallback((setId: string, fields: SetFields) => {
    setLocalRows((prev) =>
      prev.map((row) => (row.id === setId ? { ...row, ...fields } : row)),
    );
  }, []);

  const updateRowsSortOrder = useCallback(
    (updates: { exerciseId: string; sortOrder: number }[]) => {
      const sortOrderByExercise = new Map(
        updates.map((u) => [u.exerciseId, u.sortOrder]),
      );
      setLocalRows((prev) =>
        prev.map((row) => {
          const sortOrder = sortOrderByExercise.get(row.exercise_id);
          return sortOrder === undefined ? row : { ...row, sort_order: sortOrder };
        }),
      );
    },
    [],
  );

  const removeRow = useCallback((setId: string) => {
    setLocalRows((prev) => prev.filter((r) => r.id !== setId));
  }, []);

  const addRow = useCallback((row: FlatSetRow) => {
    setLocalRows((prev) => [...prev, row]);
  }, []);

  return {
    localRows,
    applyServerRows,
    updateRowNote,
    updateRowCompletion,
    updateRowStartedAt,
    updateRowFields,
    updateRowsSortOrder,
    removeRow,
    addRow,
  };
}

function rowSetSignature(rows: FlatSetRow[]): string {
  return rows
    .map(
      (r) =>
        `${r.id}:${r.exercise_id}:${r.set_number}:${r.completed_at ?? ""}:${r.reps ?? ""}:${r.weight ?? ""}`,
    )
    .join("|");
}
