import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase } from "@/lib/core/fakeSupabase";
import { createExerciseCore, type CreateExerciseCoreInput } from "@/lib/core/exercises";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const input: CreateExerciseCoreInput = {
  name: " Bench Press ",
  muscle: "Chest",
  splits: ["Upper A", "Unassigned"],
  default_sets: 3,
  tracking_type: "weighted",
  notes: null,
  machine_start_weight: null,
  machine_end_weight: null,
  machine_increment: null,
  default_reps: 8,
  progressive_overload_increment: null,
  rest_seconds: null,
  stretch_kind: "none",
  duration_start_seconds: null,
  duration_end_seconds: null,
  duration_step_seconds: null,
};

const useFake = (results: Parameters<typeof createFakeSupabase>[0]) => {
  const fake = createFakeSupabase({
    "workout_splits.select": { data: [{ name: "Upper A" }] },
    "exercises.insert": { data: { id: "ex-1" } },
    // No active draft for any split.
    "workouts.select": { data: null },
    ...results,
  });
  vi.mocked(createClient).mockResolvedValue(fake.client as never);
  return fake;
};

describe("createExerciseCore", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("returns the new exercise id and inserts its splits", async () => {
    const { calls } = useFake({});

    const result = await createExerciseCore(input);

    expect(result).toEqual({ id: "ex-1", syncedDraftIds: [] });
    expect(calls).toContainEqual({ table: "exercises", op: "insert" });
    expect(calls).toContainEqual({ table: "exercise_splits", op: "insert" });
    expect(calls).not.toContainEqual({ table: "exercises", op: "delete" });
  });

  it("rolls back the exercise when the split insert fails", async () => {
    const { calls } = useFake({
      "exercise_splits.insert": { error: { message: "split insert failed" } },
    });

    await expect(createExerciseCore(input)).rejects.toThrow("split insert failed");
    expect(calls).toContainEqual({ table: "exercises", op: "delete" });
  });

  it("rejects unknown split names before inserting anything", async () => {
    const { calls } = useFake({});

    await expect(
      createExerciseCore({ ...input, splits: ["Upper A", "Push Day", "Legs"] }),
    ).rejects.toThrow("Unknown splits: Push Day, Legs");
    expect(calls).not.toContainEqual({ table: "exercises", op: "insert" });
  });
});
