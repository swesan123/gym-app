import { describe, expect, it } from "vitest";

import {
  computeSkipOrderUpdates,
  splitCatalogNextExerciseId,
} from "@/lib/skipExerciseOrder";

const main = (
  items: Array<{ id: string; sortOrder: number; splitOrder: number }>,
) =>
  items.map((item) => ({
    id: item.id,
    stretchKind: "none" as const,
    sortOrder: item.sortOrder,
    splitOrder: item.splitOrder,
  }));

describe("computeSkipOrderUpdates", () => {
  it("defers the skipped exercise after the next exercise in split catalog order", () => {
    const updates = computeSkipOrderUpdates(main([
      { id: "a", sortOrder: 0, splitOrder: 0 },
      { id: "b", sortOrder: 1, splitOrder: 1 },
      { id: "c", sortOrder: 2, splitOrder: 2 },
    ]), "a");

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "a", sortOrder: 1 },
      { exerciseId: "c", sortOrder: 2 },
    ]);
  });

  it("does not toggle when skipping the exercise that moved into first position", () => {
    const updates = computeSkipOrderUpdates(main([
      { id: "b", sortOrder: 0, splitOrder: 1 },
      { id: "a", sortOrder: 1, splitOrder: 0 },
      { id: "c", sortOrder: 2, splitOrder: 2 },
    ]), "b");

    expect(updates).toEqual([
      { exerciseId: "a", sortOrder: 0 },
      { exerciseId: "c", sortOrder: 1 },
      { exerciseId: "b", sortOrder: 2 },
    ]);
  });

  it("defers a middle exercise after the split-catalog next exercise", () => {
    const updates = computeSkipOrderUpdates(main([
      { id: "a", sortOrder: 0, splitOrder: 0 },
      { id: "b", sortOrder: 1, splitOrder: 1 },
      { id: "c", sortOrder: 2, splitOrder: 2 },
    ]), "b");

    expect(updates).toEqual([
      { exerciseId: "a", sortOrder: 0 },
      { exerciseId: "c", sortOrder: 1 },
      { exerciseId: "b", sortOrder: 2 },
    ]);
  });

  it("only reorders exercises within the same stretch section", () => {
    const updates = computeSkipOrderUpdates(
      [
        { id: "warmup", stretchKind: "dynamic", sortOrder: 0, splitOrder: 0 },
        { id: "a", stretchKind: "none", sortOrder: 0, splitOrder: 0 },
        { id: "b", stretchKind: "none", sortOrder: 1, splitOrder: 1 },
        { id: "cooldown", stretchKind: "static", sortOrder: 0, splitOrder: 0 },
      ],
      "a",
    );

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "a", sortOrder: 1 },
    ]);
  });

  it("is a no-op when skipping the last exercise in split catalog order", () => {
    const updates = computeSkipOrderUpdates(main([
      { id: "a", sortOrder: 10, splitOrder: 0 },
      { id: "b", sortOrder: 5, splitOrder: 1 },
      { id: "c", sortOrder: 20, splitOrder: 2 },
    ]), "c");

    expect(updates).toEqual([
      { exerciseId: "b", sortOrder: 0 },
      { exerciseId: "a", sortOrder: 1 },
      { exerciseId: "c", sortOrder: 2 },
    ]);
  });

  it("is a no-op reassignment when skipping the only exercise in a section", () => {
    const updates = computeSkipOrderUpdates(
      [{ id: "a", stretchKind: "static", sortOrder: 3, splitOrder: 0 }],
      "a",
    );

    expect(updates).toEqual([{ exerciseId: "a", sortOrder: 0 }]);
  });

  it("returns an empty array when the skipped exercise is not found", () => {
    const updates = computeSkipOrderUpdates(
      main([{ id: "a", sortOrder: 0, splitOrder: 0 }]),
      "missing",
    );

    expect(updates).toEqual([]);
  });
});

describe("splitCatalogNextExerciseId", () => {
  it("returns the next exercise in split catalog order within the section", () => {
    expect(
      splitCatalogNextExerciseId(main([
        { id: "a", sortOrder: 0, splitOrder: 0 },
        { id: "b", sortOrder: 1, splitOrder: 1 },
        { id: "c", sortOrder: 2, splitOrder: 2 },
      ]), "a"),
    ).toBe("b");
  });

  it("returns null when there is no later exercise in the split", () => {
    expect(
      splitCatalogNextExerciseId(main([
        { id: "a", sortOrder: 0, splitOrder: 0 },
        { id: "b", sortOrder: 1, splitOrder: 1 },
      ]), "b"),
    ).toBeNull();
  });
});
