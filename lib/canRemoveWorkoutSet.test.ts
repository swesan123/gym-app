import { describe, expect, it } from "vitest";

import { canRemoveWorkoutSet } from "@/lib/canRemoveWorkoutSet";

describe("canRemoveWorkoutSet", () => {
  const rows = [
    { id: "s1", exercise_id: "ex1" },
    { id: "s2", exercise_id: "ex1" },
    { id: "s3", exercise_id: "ex2" },
  ];

  it("allows removal when another set exists for the exercise", () => {
    expect(canRemoveWorkoutSet(rows, "s1")).toBe(true);
  });

  it("blocks removal of the last set for an exercise", () => {
    expect(canRemoveWorkoutSet(rows, "s3")).toBe(false);
  });

  it("returns false for unknown set id", () => {
    expect(canRemoveWorkoutSet(rows, "missing")).toBe(false);
  });
});
