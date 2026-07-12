import { describe, expect, it } from "vitest";

import { computeRepCapacity } from "./repCapacity";

describe("computeRepCapacity", () => {
  it("sums reps and rir", () => {
    expect(computeRepCapacity(10, 2)).toBe(12);
  });

  it("treats null rir as zero", () => {
    expect(computeRepCapacity(8, null)).toBe(8);
  });

  it("returns null when reps missing", () => {
    expect(computeRepCapacity(null, 2)).toBeNull();
  });
});
