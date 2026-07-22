// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWorkoutElapsed } from "@/lib/useWorkoutElapsed";

describe("useWorkoutElapsed", () => {
  it("returns 0 while startAt is null", () => {
    const { result } = renderHook(() => useWorkoutElapsed(null));
    expect(result.current).toBe(0);
  });

  it("returns elapsed seconds since startAt on the first render after it is set", () => {
    const { result, rerender } = renderHook(
      ({ startAt }: { startAt: number | null }) => useWorkoutElapsed(startAt),
      { initialProps: { startAt: null as number | null } },
    );
    expect(result.current).toBe(0);

    const startAt = Date.now() - 45_000;
    act(() => {
      rerender({ startAt });
    });

    expect(result.current).toBeGreaterThanOrEqual(45);
    expect(result.current).toBeLessThan(60);
  });

  it("returns 0 once startAt is cleared back to null", () => {
    const { result, rerender } = renderHook(
      ({ startAt }: { startAt: number | null }) => useWorkoutElapsed(startAt),
      { initialProps: { startAt: Date.now() - 10_000 } as { startAt: number | null } },
    );
    expect(result.current).toBeGreaterThanOrEqual(10);

    act(() => {
      rerender({ startAt: null });
    });
    expect(result.current).toBe(0);
  });
});
