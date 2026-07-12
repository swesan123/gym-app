import { describe, expect, it } from "vitest";

import { normalizeLoggedWeight } from "@/lib/normalizeLoggedWeight";

describe("normalizeLoggedWeight", () => {
  it("defaults bodyweight null to 0", () => {
    expect(normalizeLoggedWeight("bodyweight", null)).toBe(0);
  });

  it("preserves bodyweight extra load", () => {
    expect(normalizeLoggedWeight("bodyweight", 25)).toBe(25);
  });

  it("leaves weighted null as null", () => {
    expect(normalizeLoggedWeight("weighted", null)).toBeNull();
  });

  it("ignores timed exercises", () => {
    expect(normalizeLoggedWeight("timed", null)).toBeNull();
  });
});
