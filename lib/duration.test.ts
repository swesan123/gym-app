import { describe, expect, it } from "vitest";

import { setElapsedSeconds } from "@/lib/duration";

describe("setElapsedSeconds", () => {
  it("returns the number of seconds between started_at and completed_at", () => {
    expect(
      setElapsedSeconds(
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:45.000Z",
      ),
    ).toBe(45);
  });

  it("returns null when started_at is missing", () => {
    expect(setElapsedSeconds(null, "2026-01-01T00:00:45.000Z")).toBeNull();
  });

  it("returns null when completed_at is missing", () => {
    expect(setElapsedSeconds("2026-01-01T00:00:00.000Z", null)).toBeNull();
  });

  it("returns null for a negative interval (clock skew or bad data)", () => {
    expect(
      setElapsedSeconds(
        "2026-01-01T00:00:45.000Z",
        "2026-01-01T00:00:00.000Z",
      ),
    ).toBeNull();
  });
});
