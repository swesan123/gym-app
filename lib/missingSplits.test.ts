import { describe, expect, it } from "vitest";

import {
  computeCoreSplits,
  missingSplitsForWeek,
  type WeeklySplitCounts,
} from "@/lib/missingSplits";

function weeklySplits(entries: Record<string, string[]>): WeeklySplitCounts {
  return new Map(
    Object.entries(entries).map(([week, splits]) => [week, new Set(splits)]),
  );
}

describe("computeCoreSplits", () => {
  it("returns empty when fewer than 3 weeks of history", () => {
    const weekly = weeklySplits({ W1: ["Push"], W2: ["Push"] });
    expect(computeCoreSplits(weekly, ["W1", "W2"])).toEqual([]);
  });

  it("flags a split appearing in at least half of recent weeks as core", () => {
    // Push/Pull/Legs repeat weekly; W29 only logged Legs + a one-off "Workout A".
    const weekly = weeklySplits({
      "2026-W26": ["Push", "Pull", "Legs"],
      "2026-W27": ["Push", "Pull"],
      "2026-W28": ["Pull", "Legs"],
      "2026-W29": ["Legs", "Workout A"],
    });
    const core = computeCoreSplits(weekly, [
      "2026-W29",
      "2026-W28",
      "2026-W27",
      "2026-W26",
    ]);
    expect(core).toEqual(["Legs", "Pull", "Push"]);
    expect(core).not.toContain("Workout A");
  });
});

describe("missingSplitsForWeek", () => {
  it("lists core splits with no completed workout that week (Week 28 repro — Push missing)", () => {
    const weekly = weeklySplits({
      "2026-W28": ["Legs", "Pull"],
    });
    expect(
      missingSplitsForWeek(weekly, "2026-W28", ["Legs", "Pull", "Push"]),
    ).toEqual(["Push"]);
  });

  it("returns empty when every core split was done", () => {
    const weekly = weeklySplits({
      "2026-W28": ["Legs", "Pull", "Push"],
    });
    expect(
      missingSplitsForWeek(weekly, "2026-W28", ["Legs", "Pull", "Push"]),
    ).toEqual([]);
  });

  it("returns all core splits for a week with no logged workouts", () => {
    const weekly = weeklySplits({});
    expect(
      missingSplitsForWeek(weekly, "2026-W30", ["Legs", "Pull", "Push"]),
    ).toEqual(["Legs", "Pull", "Push"]);
  });
});
