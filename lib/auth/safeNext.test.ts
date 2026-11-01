import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "@/lib/auth/safeNext";

describe("sanitizeNextPath", () => {
  it("defaults empty input to /", () => {
    expect(sanitizeNextPath("")).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("   ")).toBe("/");
  });

  it("allows same-origin relative paths", () => {
    expect(sanitizeNextPath("/settings/profile")).toBe("/settings/profile");
    expect(sanitizeNextPath("/workout/start?split=1")).toBe(
      "/workout/start?split=1",
    );
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
    expect(sanitizeNextPath("/path/with://inside")).toBe("/");
  });
});
