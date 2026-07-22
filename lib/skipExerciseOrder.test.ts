import { describe, expect, it } from "vitest";

import { computeSkipOrderUpdates } from "@/lib/skipExerciseOrder";

describe("computeSkipOrderUpdates", () => {
  it("moves the skipped exercise to the end of its section and compacts the rest", () => {
    const updates = computeSkipOrderUpdates(
      [
        { id: "a", stretchKind: "none", sortOrder: 0 },
        { id: "b", stretchKind: "none", sortOrder: 1 },
        { id: "c", stretchKind: "none", sortOrder: 2 },
      ],
      "a",
    );

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "c", sortOrder: 1 },
      { exerciseId: "a", sortOrder: 2 },
    ]);
  });

  it("only reorders exercises within the same stretch section", () => {
    const updates = computeSkipOrderUpdates(
      [
        { id: "warmup", stretchKind: "dynamic", sortOrder: 0 },
        { id: "a", stretchKind: "none", sortOrder: 0 },
        { id: "b", stretchKind: "none", sortOrder: 1 },
        { id: "cooldown", stretchKind: "static", sortOrder: 0 },
      ],
      "a",
    );

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "a", sortOrder: 1 },
    ]);
  });

  it("preserves existing relative order of the compacted exercises even with sparse sort_order values", () => {
    const updates = computeSkipOrderUpdates(
      [
        { id: "a", stretchKind: "none", sortOrder: 10 },
        { id: "b", stretchKind: "none", sortOrder: 5 },
        { id: "c", stretchKind: "none", sortOrder: 20 },
      ],
      "c",
    );

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "a", sortOrder: 1 },
      { exerciseId: "c", sortOrder: 2 },
    ]);
  });

  it("is a no-op reassignment when skipping the last exercise in a single-exercise section", () => {
    const updates = computeSkipOrderUpdates(
      [{ id: "a", stretchKind: "static", sortOrder: 3 }],
      "a",
    );

    expect(updates).toEqual([{ exerciseId: "a", sortOrder: 0 }]);
  });

  it("returns an empty array when the skipped exercise is not found", () => {
    const updates = computeSkipOrderUpdates(
      [{ id: "a", stretchKind: "none", sortOrder: 0 }],
      "missing",
    );

    expect(updates).toEqual([]);
  });
});
