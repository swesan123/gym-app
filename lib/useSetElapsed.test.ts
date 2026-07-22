// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useSetElapsed } from "@/lib/useSetElapsed";

describe("useSetElapsed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when started_at is missing", () => {
    const { result } = renderHook(() => useSetElapsed(null, null));
    expect(result.current).toBeNull();
  });

  it("returns fixed elapsed for completed sets", () => {
    const { result } = renderHook(() =>
      useSetElapsed("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:45.000Z"),
    );
    expect(result.current).toBe(45);
  });

  it("ticks live elapsed for in-progress sets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { result } = renderHook(() =>
      useSetElapsed("2026-01-01T00:00:00.000Z", null),
    );

    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(5);
  });
});
