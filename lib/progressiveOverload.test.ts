import { describe, expect, it } from "vitest";

import { applyFixedIncrement } from "./progressiveOverload";

describe("applyFixedIncrement", () => {
  it("increases weighted exercises by the fixed increment", () => {
    expect(
      applyFixedIncrement(55, 2.5, "increase", null, null, null, "weighted"),
    ).toBe(57.5);
  });

  it("decreases weighted exercises by the fixed increment", () => {
    expect(
      applyFixedIncrement(55, 2.5, "decrease", null, null, null, "weighted"),
    ).toBe(52.5);
  });

  it("keeps weight unchanged when direction is none", () => {
    expect(
      applyFixedIncrement(55, 2.5, "none", null, null, null, "weighted"),
    ).toBe(55);
  });

  it("returns null when there is no last weight", () => {
    expect(
      applyFixedIncrement(null, 2.5, "increase", null, null, null, "weighted"),
    ).toBeNull();
  });

  it("returns null when no increment is configured", () => {
    expect(
      applyFixedIncrement(55, null, "increase", null, null, null, "weighted"),
    ).toBeNull();
  });

  it("decreases assistance (increases weight) for assisted exercises on increase", () => {
    // Assisted: less assistance = harder = progression, so weight should go down.
    expect(
      applyFixedIncrement(40, 5, "increase", null, null, null, "assisted"),
    ).toBe(35);
  });

  it("increases assistance for assisted exercises on decrease", () => {
    expect(
      applyFixedIncrement(35, 5, "decrease", null, null, null, "assisted"),
    ).toBe(40);
  });

  it("snaps weighted increase up to the nearest machine grid step", () => {
    // start 50, increment 5 -> grid: 50, 55, 60, ...
    // 55 + 2.5 = 57.5, ceil to grid -> 60
    expect(
      applyFixedIncrement(55, 2.5, "increase", 50, 100, 5, "weighted"),
    ).toBe(60);
  });

  it("snaps weighted decrease down to the nearest machine grid step", () => {
    expect(
      applyFixedIncrement(55, 2.5, "decrease", 50, 100, 5, "weighted"),
    ).toBe(50);
  });

  it("snaps assisted increase (less assist) down to the nearest machine grid step", () => {
    // Assisted increase = subtract increment, then floor on grid (less assistance rounds down)
    expect(
      applyFixedIncrement(40, 5, "increase", 0, 100, 10, "assisted"),
    ).toBe(30);
  });

  it("bicep curl repro: RIR 3/2/2 at 55lb increases to 57.5lb", () => {
    expect(
      applyFixedIncrement(55, 2.5, "increase", null, null, null, "weighted"),
    ).toBe(57.5);
  });
});
