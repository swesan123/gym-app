import { describe, expect, it } from "vitest";

import { computeSetVolume } from "./volume";

describe("computeSetVolume assisted", () => {
  it("uses assistance counterweight and body weight", () => {
    const bw = 180;
    expect(
      computeSetVolume("assisted", { reps: 10, weight: 50, bodyWeight: bw }),
    ).toBe(10 * (bw - 50));
  });

  it("increases when assistance decreases (same reps)", () => {
    const bw = 180;
    const easier = computeSetVolume("assisted", {
      reps: 10,
      weight: 60,
      bodyWeight: bw,
    });
    const harder = computeSetVolume("assisted", {
      reps: 10,
      weight: 40,
      bodyWeight: bw,
    });
    expect(harder).toBeGreaterThan(easier!);
  });

  it("returns null without body weight", () => {
    expect(
      computeSetVolume("assisted", { reps: 10, weight: 50, bodyWeight: null }),
    ).toBeNull();
  });
});
