import { describe, expect, it } from "vitest";

import type { FlatSetRow } from "@/components/workout/groupSets";
import { mergeServerRows } from "@/lib/mergeServerRows";

function row(
  overrides: Partial<FlatSetRow> & Pick<FlatSetRow, "id" | "exercise_id">,
): FlatSetRow {
  return {
    set_number: 1,
    exercise_name: "Bench",
    tracking_type: "weighted",
    stretch_kind: "none",
    sort_order: 0,
    exercise_notes: null,
    machine_start_weight: null,
    machine_end_weight: null,
    machine_increment: null,
    rest_seconds: null,
    reps: null,
    weight: null,
    rir: null,
    duration_seconds: null,
    volume: null,
    note: null,
    set_type: "working",
    completed_at: null,
    ...overrides,
  };
}

describe("mergeServerRows", () => {
  it("adopts new rows from the server", () => {
    const local = [row({ id: "a", exercise_id: "ex1", reps: 8 })];
    const server = [
      row({ id: "a", exercise_id: "ex1", reps: 5 }),
      row({ id: "b", exercise_id: "ex2", reps: 10 }),
    ];
    const merged = mergeServerRows(local, server);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === "a")?.reps).toBe(8);
    expect(merged.find((r) => r.id === "b")?.reps).toBe(10);
  });

  it("preserves local completion over server null", () => {
    const local = [
      row({
        id: "a",
        exercise_id: "ex1",
        completed_at: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const server = [row({ id: "a", exercise_id: "ex1", completed_at: null })];
    expect(mergeServerRows(local, server)[0].completed_at).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("keeps optimistic local-only rows until server catches up", () => {
    const local = [row({ id: "temp", exercise_id: "ex1", reps: 12 })];
    const server: FlatSetRow[] = [];
    const merged = mergeServerRows(local, server);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("temp");
  });
});
