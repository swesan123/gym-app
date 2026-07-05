// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCountdown } from "@/lib/useCountdown";

describe("useCountdown", () => {
  it("returns 0 while endAt is null", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });

  it("returns a positive remaining time on the very first render after endAt is set (no stale-0 race)", () => {
    const { result, rerender } = renderHook(
      ({ endAt }: { endAt: number | null }) => useCountdown(endAt),
      { initialProps: { endAt: null as number | null } },
    );
    expect(result.current).toBe(0);

    const endAt = Date.now() + 30_000;
    act(() => {
      rerender({ endAt });
    });

    // Regression guard: a prior implementation derived `remaining` from
    // state initialized before `endAt` changed, so the first render after
    // starting a countdown incorrectly reported 0 — which made completion
    // effects elsewhere (rest overlay, timed set timer) tear the timer down
    // immediately instead of counting down.
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(30);
  });

  it("returns 0 once endAt is cleared back to null", () => {
    const { result, rerender } = renderHook(
      ({ endAt }: { endAt: number | null }) => useCountdown(endAt),
      { initialProps: { endAt: Date.now() + 10_000 } as { endAt: number | null } },
    );
    expect(result.current).toBeGreaterThan(0);

    act(() => {
      rerender({ endAt: null });
    });
    expect(result.current).toBe(0);
  });
});
