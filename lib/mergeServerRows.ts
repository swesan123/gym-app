import type { FlatSetRow } from "@/components/workout/groupSets";

/**
 * Merge freshly fetched server rows into the client's optimistic view.
 * Preserves in-progress field edits and completion state for existing sets;
 * adopts new sets and metadata from the server.
 */
export function mergeServerRows(
  local: FlatSetRow[],
  server: FlatSetRow[],
): FlatSetRow[] {
  const localById = new Map(local.map((r) => [r.id, r]));
  const serverIds = new Set(server.map((r) => r.id));

  const merged = server.map((serverRow) => {
    const localRow = localById.get(serverRow.id);
    if (!localRow) return serverRow;

    return {
      ...serverRow,
      reps: localRow.reps,
      weight: localRow.weight,
      rir: localRow.rir,
      duration_seconds: localRow.duration_seconds,
      note: localRow.note,
      set_type: localRow.set_type,
      completed_at: localRow.completed_at ?? serverRow.completed_at,
      volume: localRow.volume,
    };
  });

  for (const localRow of local) {
    if (!serverIds.has(localRow.id)) {
      merged.push(localRow);
    }
  }

  return merged;
}
