import { describe, expect, it } from "vitest";

import { buildDurationPresets, buildMachineWeightPresets } from "@/components/workout/setFieldPresets";

describe("buildDurationPresets", () => {
  it("generates an evenly-spaced duration grid in seconds", () => {
    expect(
      buildDurationPresets({
        durationStartSeconds: 15,
        durationEndSeconds: 45,
        durationStepSeconds: 15,
      }),
    ).toEqual([15, 30, 45]);
  });

  it("returns empty when any bound is missing", () => {
    expect(
      buildDurationPresets({ durationStartSeconds: 15, durationEndSeconds: null, durationStepSeconds: 15 }),
    ).toEqual([]);
  });

  it("returns empty when step is not positive", () => {
    expect(
      buildDurationPresets({ durationStartSeconds: 15, durationEndSeconds: 45, durationStepSeconds: 0 }),
    ).toEqual([]);
  });

  it("returns empty when end is before start", () => {
    expect(
      buildDurationPresets({ durationStartSeconds: 45, durationEndSeconds: 15, durationStepSeconds: 15 }),
    ).toEqual([]);
  });
});

describe("buildMachineWeightPresets (unchanged behavior after sharing grid logic)", () => {
  it("still generates a machine weight grid", () => {
    expect(
      buildMachineWeightPresets({
        machineStartWeight: 20,
        machineEndWeight: 60,
        machineIncrement: 20,
      }),
    ).toEqual([20, 40, 60]);
  });
});
