import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase } from "@/lib/core/fakeSupabase";
import { createWorkoutDraft } from "@/lib/core/workouts";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const useFake = (results: Parameters<typeof createFakeSupabase>[0]) => {
  const fake = createFakeSupabase({
    "workout_splits.select": { data: { id: "split-1" } },
    "workouts.insert": { data: { id: "workout-1" } },
    "exercises.select": {
      data: [
        {
          id: "ex-1",
          name: "Bench Press",
          default_sets: 2,
          default_reps: 8,
          progressive_overload_increment: null,
          tracking_type: "weighted",
          machine_start_weight: null,
          machine_end_weight: null,
          machine_increment: null,
          exercise_splits: [{ sort_order: 0 }],
        },
      ],
    },
    // No completed workouts, so no previous performance to seed from.
    "workouts.select": { data: [] },
    ...results,
  });
  vi.mocked(createClient).mockResolvedValue(fake.client as never);
  return fake;
};

describe("createWorkoutDraft", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("rejects an unknown split without creating a workout", async () => {
    const { calls } = useFake({ "workout_splits.select": { data: null } });

    await expect(createWorkoutDraft("Push Day")).rejects.toThrow("Unknown split");
    expect(calls).not.toContainEqual({ table: "workouts", op: "insert" });
  });

  it("rejects an empty split", async () => {
    useFake({});

    await expect(createWorkoutDraft("  ")).rejects.toThrow("Choose a split");
  });

  it("returns the new workout id and seeds sets and exercise order", async () => {
    const { calls } = useFake({});

    await expect(createWorkoutDraft("Upper A")).resolves.toEqual({
      id: "workout-1",
    });
    expect(calls).toContainEqual({ table: "workout_sets", op: "insert" });
    expect(calls).toContainEqual({ table: "workout_exercise_order", op: "insert" });
  });
});
